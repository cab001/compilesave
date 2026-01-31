import subprocess

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

if errors:
    print("Found Errors! Sending to Gemini...")
    # This is where you pass 'errors' to your Gemini chat.send_message()