import operator
from typing import Annotated, TypedDict, Union
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
from pathlib import Path
import dotenv
import os

from tools.chart_parser import analyze_dental_chart, extract_chart_from_note 

# ====================== API KEY FETCHING ======================
g_dotenv_loaded = False
def getenv(variable: str) -> str:
    global g_dotenv_loaded
    if not g_dotenv_loaded:
        g_dotenv_loaded = True
        dotenv.load_dotenv()
    return os.getenv(variable)

def get_api_key(key_name):
    api_key = getenv(key_name)
    if not api_key:
        raise ValueError(f"{key_name} not set.")
    return api_key

# ====================== MODEL ======================
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

def build_agent():
    dotenv.load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables.")

    tools = [analyze_dental_chart, extract_chart_from_note] 

    model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=api_key, temperature=0, max_retries=2)
    model_with_tools = model.bind_tools(tools)
    memory = MemorySaver()

    def call_model(state: AgentState):
        messages = state["messages"]

        system_prompt = SystemMessage(content=(
            "You are a highly capable dental documentation assistant. "
            "You can analyze patient charts, update records, and extract structured data from clinical notes. "
            "If asked to analyze an uploaded file/document, use the analyze_dental_chart tool. "
            "If asked to map a clinical free-text note into a chart, use the extract_chart_from_note tool."
        ))

        messages_for_llm = [system_prompt] + messages
        response = model_with_tools.invoke(messages_for_llm)
        return {"messages": [response]}

    def should_continue(state: AgentState):
        last_message = state["messages"][-1]
        if last_message.tool_calls:
            return "tools"
        return END
    
    tool_node = ToolNode(tools)
    workflow = StateGraph(AgentState)

    workflow.add_node("agent", call_model)
    workflow.add_node("tools", tool_node)
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges("agent", should_continue, ["tools", END])
    workflow.add_edge("tools", "agent")

    return workflow.compile(checkpointer=memory)