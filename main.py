import os
import subprocess 
from google import genai
from google.genai import types
import sys
import json

def main():

    if len(sys.argv) < 2:
        return
    
    raw_error = sys.argv[1]

    




client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# instructions
instructions = """
Your goal is to simplify complex error messages for beginner developers.
- be extremely concise and specific and clear
- explain as if you are speaking to a beginner in code. they dont 
    understand and just want to know what the real/main issue is
- don't use conversational filler (e.g. "I'm happy to help" or "Here is your explanation")
- you are patient and friendly
"""

# response = client.models.generate_content(
#     model="gemini-2.5-flash",
#     contents="test from VS Code"
# )

chat = client.chats.create(
    model="gemini-2.5-flash",
    config=types.GenerateContentConfig(
        system_instruction=instructions,
        temperature=0.2 #lower temp = more focused/less chatty
    )
)

# response2 = chat.send_message("Hi Gemini, what's up?")
# response3 = chat.send_message("whats 1+1?")

# print(response2.text)
# print(response3.text)

while True : 
    error_msg = get_compiler_error(command) 
    if error_msg is not None: 
        response = chat.send_message(f"Simplify this compiler error for a beginner, 2-3 sentences: {error_msg}")
        print(response.text)


error_msg = 'main.c:6:5: error: unknown type name ‘Node’\n    6 |     Node* next;\n      |     ^~~~'

response4 = chat.send_message(f"Simplify this compiler error for a beginner, 2-3 sentences: {error_msg}")
print(response4.text)


def get_compiler_error(command):
    try:
        # Run the command (e.g., ["g++", "main.cpp"])
        # capture_output=True grabs both stdout and stderr
        # text=True returns strings instead of raw bytes
        result = subprocess.run(command, capture_output=True, text=True)
        
        # If the returncode is not 0, there was an error
        if result.returncode != 0:
            return result.stderr
        return None # No errors!
        
    except FileNotFoundError:
        return "Compiler not found. Make sure it's installed and in your PATH."

# Example usage:
compiler_cmd = ["g++", "my_code.cpp", "-o", "my_app"]
errors = get_compiler_error(compiler_cmd)
