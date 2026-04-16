from typing import Annotated, TypedDict
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
import dotenv
import os

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

def build_agent(model, tools):
    model_with_tools = model.bind_tools(tools)

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

    return workflow.compile()