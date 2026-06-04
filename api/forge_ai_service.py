import json
import os
import random
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="PowerZone ForgeAi API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """
You are ForgeAi, a professional fitness coach AI for PowerZone.

You create structured workout plans and targeted exercise suggestions.

The user can ask for:
- a full workout route for today
- exercises for a specific body part or muscle group
- details for one exercise
- replacement exercises when they already did something

RULES:
- Always analyze previous workout from user context
- Increase reps or weight if user completed last session successfully
- Change exercises every 2-3 sessions
- Ensure progressive overload
- If no history exists, start beginner plan
- Avoid repeating same workout blindly

- If last workout score is 7-10 -> increase intensity
- If score is 4-6 -> maintain same level
- If score is 1-3 -> reduce intensity and focus on form
- If no score exists -> assume beginner level

If workout_score exists:
- 8-10 -> increase intensity next session
- 5-7 -> maintain progression
- 1-4 -> reduce load and simplify exercises

If feedback text exists:
- use it to adjust difficulty and exercise selection

When the user asks for a specific body part, return exactly 3 exercise
options unless they ask for a different number.

When the user says they already did an exercise, do not repeat that exercise.
Use the recent conversation and excluded exercises to infer what should be
replaced.

When the user asks for "another", "replace", or says "already did", return
request_type "replacement" with exactly 1 fresh exercise unless they ask for
more. The replacement must not duplicate any recently suggested or excluded
exercise.

Return ONLY valid JSON. No markdown. No extra text.

Use this JSON shape:

{
  "request_type": "full_workout | targeted_exercises | exercise_details | replacement",
  "target": "",
  "replacement_for": "",
  "day": "",
  "focus": "",
  "warmup": [],
  "exercises": [
    {
      "name": "",
      "muscle_group": "",
      "equipment": "",
      "sets": 0,
      "reps": "",
      "rest": "",
      "instructions": [],
      "form_tips": [],
      "why_selected": ""
    }
  ],
  "cooldown": [],
  "reasoning": "",
  "intensity_level": "low | medium | high"
}
"""


class CoachRequest(BaseModel):
    message: str = Field(default="")
    history: list[dict[str, Any]] = Field(default_factory=list)
    seen_exercises: list[str] = Field(default_factory=list)
    excluded_exercises: list[str] = Field(default_factory=list)
    user_id: int = Field(default=5, ge=1)


_supabase_client = None
_supabase_unavailable = False


def _get_supabase_client():
    global _supabase_client, _supabase_unavailable
    if _supabase_client is not None:
        return _supabase_client
    if _supabase_unavailable:
        return None

    url = os.getenv("SUPABASE_URL", "").strip()
    key = (os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "").strip()
    if not url or not key:
        return None

    try:
        from supabase import create_client
    except ImportError:
        _supabase_unavailable = True
        return None

    _supabase_client = create_client(url, key)
    return _supabase_client


def _extract_json(raw_text: str) -> dict[str, Any]:
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"Model did not return JSON: {raw_text}")

    return json.loads(text[start : end + 1])


def _remember_exercises(response: dict[str, Any], seen_exercises: list[str]) -> None:
    for exercise in response.get("exercises", []):
        name = exercise.get("name")
        if name and name not in seen_exercises:
            seen_exercises.append(name)


def _find_completed_exercises(user_input: str, seen_exercises: list[str]) -> list[str]:
    text = user_input.lower()
    if not re.search(r"\b(already did|done|completed|finished)\b", text):
        return []
    return [exercise for exercise in seen_exercises if exercise.lower() in text]


def _is_replacement_request(user_input: str) -> bool:
    return bool(re.search(r"\b(already did|another|replace|different|swap)\b", user_input.lower()))


def _extract_muscle_hint(workout_text: str) -> list[str]:
    text = workout_text.lower()
    muscles = []

    if "chest" in text or "push-up" in text or "bench" in text:
        muscles.append("chest")
    if "back" in text or "row" in text or "pull" in text:
        muscles.append("back")
    if "squat" in text or "leg" in text or "deadlift" in text:
        muscles.append("legs")
    if "shoulder" in text or "press" in text:
        muscles.append("shoulders")

    return muscles


def _get_training_day(session_count: int) -> str:
    cycle = ["Push", "Pull", "Legs", "Rest"]
    return cycle[session_count % 4]


def _get_user(user_id: int) -> dict[str, Any] | None:
    client = _get_supabase_client()
    if client is None:
        return None

    response = client.table("users").select("*").eq("id", user_id).limit(1).execute()
    if response.data:
        return response.data[0]
    return None


def _get_workout_history(user_id: int) -> list[dict[str, Any]]:
    client = _get_supabase_client()
    if client is None:
        return []

    response = (
        client.table("workout_history")
        .select("*")
        .eq("user_id", user_id)
        .order("id", desc=True)
        .limit(5)
        .execute()
    )
    return response.data or []


def _get_last_score(user_id: int) -> Any:
    client = _get_supabase_client()
    if client is None:
        return None

    response = (
        client.table("workout_history")
        .select("workout_score")
        .eq("user_id", user_id)
        .order("id", desc=True)
        .limit(1)
        .execute()
    )
    if response.data:
        return response.data[0].get("workout_score")
    return None


def _save_workout(user_id: int, workout_payload: dict[str, Any], score: int = 5) -> None:
    client = _get_supabase_client()
    if client is None:
        return

    client.table("workout_history").insert(
        {
            "user_id": user_id,
            "workout_text": json.dumps(workout_payload),
            "workout_score": score,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()


def _build_fallback_user(user_id: int) -> dict[str, Any]:
    return {
        "id": user_id,
        "name": "PowerZone Athlete",
        "age": 24,
        "weight": 72,
        "goal": "Build muscle and improve conditioning",
        "experience": "Intermediate",
        "equipment": "Gym machines, dumbbells, barbells, cables",
    }


def build_user_context(user_id: int) -> str:
    user = _get_user(user_id) or _build_fallback_user(user_id)
    history = _get_workout_history(user_id)
    last_score = _get_last_score(user_id)

    if history:
        last_workout = history[0].get("workout_text", "No previous workout")
        last_muscles = _extract_muscle_hint(last_workout)
        total_sessions = len(history)
    else:
        last_workout = "No previous workout"
        last_muscles = []
        total_sessions = 0

    training_day = _get_training_day(total_sessions)

    return f"""
USER PROFILE:
Name: {user.get("name", "PowerZone Athlete")}
Age: {user.get("age", "Not provided")}
Weight: {user.get("weight", "Not provided")} kg
Goal: {user.get("goal", "General fitness")}
Experience Level: {user.get("experience", "Beginner")}
Available Equipment: {user.get("equipment", "Basic gym equipment")}

TRAINING OVERVIEW:
Total Sessions Completed: {total_sessions}
Current Training Split: {training_day}

Muscle Groups Trained Recently: {", ".join(last_muscles) if last_muscles else "None"}

LAST WORKOUT SUMMARY:
{last_workout}

TASK:
Create a personalized workout for today.

---

COACHING GUIDELINES:

1. PROGRESSION:
- Increase reps, sets, or intensity if previous workout was manageable
- Keep progression gradual and realistic

2. SPLIT LOGIC:
- Push -> chest, shoulders, triceps
- Pull -> back, biceps
- Legs -> quads, hamstrings, calves
- Rest -> mobility, stretching, recovery

3. RECOVERY:
- Avoid training same muscle group on consecutive days
- Ensure at least 48 hours recovery per muscle group

4. EXPERIENCE ADAPTATION:
- Beginner (0-5 sessions): simple full-body focus, light volume
- Intermediate (6-15 sessions): structured push/pull/legs split
- Advanced (15+ sessions): optimized splits with higher volume

5. SAFETY:
- Prioritize correct form over heavy load
- Avoid excessive intensity increases

6. WORKOUT PERFORMANCE:
Last workout score (1-10): {last_score if last_score is not None else "No data"}

OUTPUT REQUIREMENT:
- Structured workout (warm-up, main sets, optional cooldown)
- Clear exercises with sets and reps
- Brief reasoning for workout choices
"""


def generate_coach_response(
    context: str,
    user_request: str,
    conversation_history: list[dict[str, Any]] | None = None,
    excluded_exercises: list[str] | None = None,
    seen_exercises: list[str] | None = None,
) -> dict[str, Any]:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        return _generate_fallback_response(
            user_request=user_request,
            excluded_exercises=excluded_exercises or [],
            seen_exercises=seen_exercises or [],
            conversation_history=conversation_history or [],
        )

    conversation_history = conversation_history or []
    excluded_exercises = excluded_exercises or []

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "USER CONTEXT:\n"
                f"{context}\n\n"
                "EXERCISES TO AVOID THIS SESSION:\n"
                f"{', '.join(excluded_exercises) if excluded_exercises else 'None'}"
            ),
        },
    ]

    messages.extend(conversation_history[-6:])
    messages.append({"role": "user", "content": user_request})

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "openai/gpt-4o-mini",
            "messages": messages,
            "temperature": 0.4,
        },
        timeout=60,
    )
    response.raise_for_status()

    raw = response.json()["choices"][0]["message"]["content"]
    return _extract_json(raw)


def _fallback_exercises_for_focus(focus: str) -> list[dict[str, Any]]:
    library = {
        "chest": [
            ("Incline Dumbbell Press", "chest", "dumbbells"),
            ("Push-Up", "chest", "bodyweight"),
            ("Cable Fly", "chest", "cable machine"),
            ("Flat Dumbbell Press", "chest", "dumbbells"),
            ("Machine Chest Press", "chest", "machine"),
            ("Deficit Push-Up", "chest", "bodyweight"),
            ("Pec Deck Fly", "chest", "machine"),
            ("Low-Incline Smith Press", "upper chest", "smith machine"),
        ],
        "legs": [
            ("Goblet Squat", "legs", "dumbbell"),
            ("Romanian Deadlift", "hamstrings", "barbell"),
            ("Walking Lunge", "legs", "dumbbells"),
            ("Leg Press", "quads", "machine"),
            ("Bulgarian Split Squat", "legs", "dumbbells"),
            ("Hamstring Curl", "hamstrings", "machine"),
            ("Step-Up", "legs", "bench and dumbbells"),
            ("Hack Squat", "quads", "machine"),
        ],
        "back": [
            ("Lat Pulldown", "back", "cable machine"),
            ("Seated Cable Row", "back", "cable machine"),
            ("Single-Arm Dumbbell Row", "back", "dumbbell"),
            ("Chest-Supported Row", "back", "machine"),
            ("Straight-Arm Pulldown", "lats", "cable machine"),
            ("Barbell Bent-Over Row", "back", "barbell"),
            ("Assisted Pull-Up", "back", "machine"),
            ("T-Bar Row", "mid back", "machine"),
        ],
        "shoulders": [
            ("Dumbbell Shoulder Press", "shoulders", "dumbbells"),
            ("Lateral Raise", "shoulders", "dumbbells"),
            ("Face Pull", "rear delts", "cable machine"),
            ("Arnold Press", "shoulders", "dumbbells"),
            ("Cable Lateral Raise", "side delts", "cable machine"),
            ("Rear Delt Fly", "rear delts", "machine"),
            ("Landmine Press", "shoulders", "barbell"),
            ("Upright Row", "shoulders", "barbell"),
        ],
        "arms": [
            ("Barbell Curl", "biceps", "barbell"),
            ("Hammer Curl", "biceps", "dumbbells"),
            ("Cable Tricep Pushdown", "triceps", "cable machine"),
            ("Incline Dumbbell Curl", "biceps", "dumbbells"),
            ("EZ-Bar Curl", "biceps", "ez bar"),
            ("Overhead Dumbbell Extension", "triceps", "dumbbell"),
            ("Skull Crusher", "triceps", "ez bar"),
            ("Rope Pushdown", "triceps", "cable machine"),
        ],
        "full": [
            ("Goblet Squat", "legs", "dumbbell"),
            ("Bench Press", "chest", "barbell"),
            ("Lat Pulldown", "back", "cable machine"),
            ("Romanian Deadlift", "hamstrings", "barbell"),
            ("Dumbbell Shoulder Press", "shoulders", "dumbbells"),
            ("Walking Lunge", "legs", "dumbbells"),
            ("Chest-Supported Row", "back", "machine"),
            ("Machine Chest Press", "chest", "machine"),
            ("Leg Press", "quads", "machine"),
            ("Arnold Press", "shoulders", "dumbbells"),
            ("Cable Fly", "chest", "cable machine"),
            ("Straight-Arm Pulldown", "lats", "cable machine"),
        ],
    }

    items = library.get(focus, library["full"])
    exercises = []
    for name, muscle_group, equipment in items:
        exercises.append(
            {
                "name": name,
                "muscle_group": muscle_group,
                "equipment": equipment,
                "sets": 3,
                "reps": "10-12",
                "rest": "60-75 sec",
                "instructions": [
                    "Control the eccentric and keep a steady tempo.",
                    "Use full range of motion without compromising form.",
                ],
                "form_tips": [
                    "Brace your core before each rep.",
                    "Stop 1-2 reps before technical failure.",
                ],
                "why_selected": "Balanced for progression, good technique practice, and manageable recovery.",
            }
        )
    return exercises


def _infer_focus(user_request: str) -> str:
    text = user_request.lower()
    for focus in ("chest", "legs", "back", "shoulders"):
        if focus in text:
            return focus
    if any(term in text for term in ("bicep", "tricep", "arms", "curl")):
        return "arms"
    return "full"


def _choose_fallback_exercises(
    focus: str,
    count: int,
    seen_exercises: list[str],
    excluded_exercises: list[str],
    conversation_history: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    pool = _fallback_exercises_for_focus(focus)
    seen_set = {name.lower() for name in seen_exercises}
    excluded_set = {name.lower() for name in excluded_exercises}

    available = [item for item in pool if item["name"].lower() not in excluded_set]
    unseen = [item for item in available if item["name"].lower() not in seen_set]
    fallback = [item for item in available if item["name"].lower() in seen_set]

    rng = random.SystemRandom()
    rng.shuffle(unseen)
    rng.shuffle(fallback)

    ordered = unseen + fallback
    if not ordered:
        ordered = pool[:]
        rng.shuffle(ordered)

    if len(ordered) >= count:
        return ordered[:count]

    # If we run out of unseen choices, cycle through the library in a different order.
    rotation_seed = len(conversation_history) + len(seen_exercises) + len(excluded_exercises)
    rotation = rotation_seed % len(pool) if pool else 0
    rotated_pool = pool[rotation:] + pool[:rotation]
    selected_names = {item["name"].lower() for item in ordered}

    for item in rotated_pool:
        if item["name"].lower() in selected_names:
            continue
        ordered.append(item)
        selected_names.add(item["name"].lower())
        if len(ordered) == count:
            break

    return ordered[:count]


def _generate_fallback_response(
    user_request: str,
    excluded_exercises: list[str],
    seen_exercises: list[str],
    conversation_history: list[dict[str, Any]],
) -> dict[str, Any]:
    focus = _infer_focus(user_request)
    is_replacement = _is_replacement_request(user_request)

    if is_replacement:
        replacement = _choose_fallback_exercises(focus, 1, seen_exercises, excluded_exercises, conversation_history)
        return {
            "request_type": "replacement",
            "target": focus,
            "replacement_for": "",
            "day": "",
            "focus": focus.title(),
            "warmup": [],
            "exercises": replacement,
            "cooldown": ["2-3 minutes light stretching"],
            "reasoning": "ForgeAi is running in offline fallback mode, so this replacement is generated locally from the built-in exercise library.",
            "intensity_level": "medium",
        }

    if "explain" in user_request.lower() or "details" in user_request.lower():
        detail = _choose_fallback_exercises(focus, 1, seen_exercises, excluded_exercises, conversation_history)
        return {
            "request_type": "exercise_details",
            "target": focus,
            "replacement_for": "",
            "day": "",
            "focus": focus.title(),
            "warmup": [],
            "exercises": detail,
            "cooldown": [],
            "reasoning": "ForgeAi is running in offline fallback mode, so this explanation is based on the built-in exercise library.",
            "intensity_level": "medium",
        }

    request_type = "targeted_exercises" if focus != "full" else "full_workout"
    target_count = 3 if request_type == "targeted_exercises" else 5
    selected = _choose_fallback_exercises(
        focus,
        target_count,
        seen_exercises,
        excluded_exercises,
        conversation_history,
    )
    return {
        "request_type": request_type,
        "target": focus,
        "replacement_for": "",
        "day": "Today",
        "focus": focus.title(),
        "warmup": ["5 minutes brisk walk", "Dynamic mobility for the target joints"],
        "exercises": selected,
        "cooldown": ["2-3 minutes nasal breathing", "Gentle stretching for worked muscles"],
        "reasoning": "ForgeAi is running in offline fallback mode because OPENROUTER_API_KEY is not configured. The plan is generated locally so you can still test the full product flow.",
        "intensity_level": "medium",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
        "supabase_configured": bool(_get_supabase_client()),
    }


@app.post("/")
@app.post("/api/forge-ai")
def coach_api(payload: CoachRequest) -> dict[str, Any]:
    user_input = payload.message.strip() or "Give me the full workout route for today."
    history = payload.history or []
    seen_exercises = payload.seen_exercises or []
    excluded_exercises = payload.excluded_exercises or []

    already_done = _find_completed_exercises(user_input, seen_exercises)
    excluded_exercises = sorted(set(excluded_exercises + already_done))

    coach_request = user_input
    if _is_replacement_request(user_input):
        excluded_for_request = sorted(set(excluded_exercises + seen_exercises))
        coach_request = (
            f"{user_input}\n\n"
            "Return exactly 1 new replacement exercise in JSON. "
            "Do not repeat any previously suggested exercise."
        )
    else:
        excluded_for_request = excluded_exercises

    try:
        context = build_user_context(payload.user_id)
        response = generate_coach_response(
            context=context,
            user_request=coach_request,
            conversation_history=history,
            excluded_exercises=excluded_for_request,
            seen_exercises=seen_exercises,
        )
    except requests.HTTPError as exc:
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    _remember_exercises(response, seen_exercises)
    history = history[-6:] + [
        {"role": "user", "content": user_input},
        {"role": "assistant", "content": json.dumps(response)},
    ]

    if response.get("request_type") == "full_workout":
        _save_workout(payload.user_id, response)

    return {
        "response": response,
        "history": history,
        "seen_exercises": seen_exercises,
        "excluded_exercises": excluded_exercises,
    }
