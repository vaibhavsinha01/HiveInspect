# this file would contain the code for the ai agent 
from google import genai 

class AgentHomeInspector:
    def __init__(self):
        self.client = genai.Client()
        # self.api_key = "" # we put this inside the .env file
        self.stream = self.client.interactions.create(
            model="gemini-2.5-pro",
            input=self.get_prompt(),
            tools=[self.extract_data],
            stream=True
        )

    def get_prompt(self):
        return f"You are an advance AI agent associated with home inspection, your job is to take the data that is given to you and create a feedback based on the inputs"

    def extract_data(self):
        return ""

