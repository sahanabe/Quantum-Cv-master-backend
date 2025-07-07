import os
import time
import requests

HUGGINGFACE_API_TOKEN = os.getenv('HUGGINGFACE_API_TOKEN')
HF_MODEL = 'microsoft/DialoGPT-medium'
API_URL = f'https://api-inference.huggingface.co/models/{HF_MODEL}'

headers = {
    'Authorization': f'Bearer {HUGGINGFACE_API_TOKEN}',
    'Content-Type': 'application/json',
}

def ask_bot(message):
    payload = {"inputs": {"text": message}}
    response = requests.post(API_URL, headers=headers, json=payload)
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and data and 'generated_text' in data[0]:
            return data[0]['generated_text']
        elif 'generated_text' in data:
            return data['generated_text']
        elif 'error' in data:
            return f"HuggingFace error: {data['error']}"
        else:
            return str(data)
    else:
        return f"API error: {response.status_code} {response.text}"

def auto_chat():
    print("Auto-running chatbot. Type 'exit' to quit.")
    while True:
        user_input = input("You: ")
        if user_input.lower() in ("exit", "quit"): break
        print("Bot is thinking...")
        reply = ask_bot(user_input)
        print(f"Bot: {reply}\n")
        time.sleep(1)

if __name__ == "__main__":
    auto_chat()
