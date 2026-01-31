#!/usr/bin/env python3
import os
import sys
import json

try:
    from google import genai
    from google.genai import types
except Exception as e:
    genai = None


def respond_with_json(explanation, raw):
    payload = {"explanation": explanation.strip(), "error": raw}
    print(json.dumps(payload))
    sys.exit(0)


def main():
    if len(sys.argv) < 2:
        respond_with_json("No error message provided.", "")

    raw_error = sys.argv[1]
    api_key = os.getenv("GEMINI_API_KEY")

    instructions = (
        "Your goal is to simplify complex error messages for beginner developers. "
        "Be extremely concise (2-3 sentences), specific and clear. Explain as if speaking to a beginner: focus on the main cause and one quick suggestion. "
        "Do not add conversational filler."
    )

    if genai is None or not api_key:
        # Fallback when the Gemini client or API key isn't available.
        explanation = (
            "(Offline) Could not reach Gemini API. "
            "Try setting the GEMINI_API_KEY environment variable and installing the google-genai package.\n" 
            f"Raw error: {raw_error}"
        )
        respond_with_json(explanation, raw_error)

    try:
        client = genai.Client(api_key=api_key)
        chat = client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=instructions,
                temperature=0.2
            )
        )

        response = chat.send_message(f"Simplify this compiler error for a beginner, 2-3 sentences: {raw_error}")
        explanation = getattr(response, 'text', str(response))
        respond_with_json(explanation, raw_error)

    except Exception as e:
        respond_with_json(f"Error calling Gemini API: {e}", raw_error)


if __name__ == '__main__':
    main()
