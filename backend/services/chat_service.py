from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

PROMPT_PATH = "prompts/coach_prompt.txt"


def load_system_prompt():
    with open(PROMPT_PATH, "r") as file:
        return file.read()


SYSTEM_PROMPT = load_system_prompt()


async def generate_ai_response(message: str):
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": message,
            },
        ],
        temperature=0.7,
    )

    return response.choices[0].message.content