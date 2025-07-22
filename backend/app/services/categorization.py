from llama_cpp import Llama

llm = Llama.from_pretrained(
	repo_id="hieupt/TinyLlama-1.1B-Chat-v1.0-Q4_K_M-GGUF",
	filename="tinyllama-1.1b-chat-v1.0-q4_k_m.gguf",
)

def categorize_content(content: str) -> str:
    prompt = f"""Classify the following content into only one of the following categories:
- text
- url
- code
- email
- pii

Content: \"\"\"{content}\"\"\"

examples:
code: "import os\\nprint(os.getcwd())", "def main():\\n    print('Hello, world!')", "class MyClass:\\n    def __init__(self, name):\\n        self.name = name"

Category:"""

    response = llm(prompt, stop=["\n"], max_tokens=10)
    return response['choices'][0]['text'].strip().lower() if response['choices'][0]['text'] else "unknown"


def get_title(content: str) -> str:
    prompt = f"""Generate a title for the following content. The title should be a single sentence that captures the main idea of the content:

Content: \"\"\"{content}\"\"\"
Title:"""

    response = llm(prompt, stop=["\n"], max_tokens=10)
    return response['choices'][0]['text'].strip().lower()