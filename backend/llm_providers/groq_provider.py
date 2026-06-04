"""
Groq fast inference LLM provider implementation.
"""
import json
from typing import List, Dict, Any, Optional, Union, AsyncIterator
try:
    from groq import AsyncGroq
except ImportError:
    # Groq SDK may not be installed, create a placeholder
    AsyncGroq = None

from .base import LLMProvider


class GroqProvider(LLMProvider):
    """Groq fast inference provider implementation."""
    
    def __init__(self, api_key: str, model: str = "meta-llama/llama-4-scout-17b-16e-instruct"):
        """
        Initialize Groq provider.
        
        Args:
            api_key: Groq API key
            model: Model name (default: meta-llama/llama-4-scout-17b-16e-instruct)
        """
        super().__init__(api_key, model)
        
        if AsyncGroq is None:
            raise ImportError(
                "Groq SDK not installed. Install with: pip install groq"
            )
        
        self.client = AsyncGroq(api_key=api_key)
        self._supported_models = [
            "meta-llama/llama-4-scout-17b-16e-instruct",
            "meta-llama/llama-4-maverick-17b-128e-instruct",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "qwen-2.5-32b",
        ]
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        """Generate chat completion using Groq API."""
        params = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "timeout": 90.0
        }
        
        if tools:
            params["tools"] = tools
            params["tool_choice"] = "auto"
        
        if max_tokens:
            params["max_tokens"] = max_tokens
        
        response = await self.client.chat.completions.create(**params)
        return self._format_response(response)
    
    def convert_tools_format(self, mcp_tools: List[Any]) -> List[Dict[str, Any]]:
        """Convert MCP tools to Groq format (similar to OpenAI)."""
        groq_tools = []
        
        for tool in mcp_tools:
            groq_tool = {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.inputSchema
                }
            }
            groq_tools.append(groq_tool)
        
        return groq_tools
    
    def parse_tool_calls(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract tool calls from Groq response."""
        # Similar to OpenAI format
        tool_calls = []
        
        message = response.get("choices", [{}])[0].get("message", {})
        raw_tool_calls = message.get("tool_calls", [])
        
        for tool_call in raw_tool_calls:
            tool_calls.append({
                "id": tool_call.id,
                "name": tool_call.function.name,
                "arguments": json.loads(tool_call.function.arguments)
            })
        
        return tool_calls
    
    async def validate_api_key(self) -> bool:
        """Validate Groq API key."""
        try:
            await self.client.models.list()
            return True
        except Exception:
            return False
    
    @property
    def supported_models(self) -> List[str]:
        """List of supported Groq models."""
        return self._supported_models
    
    def _format_response(self, response) -> Dict[str, Any]:
        """Format Groq response to standard format."""
        choice = response.choices[0]
        result = {
            "content": choice.message.content,
            "role": choice.message.role,
            "tool_calls": choice.message.tool_calls if hasattr(choice.message, "tool_calls") else None,
            "finish_reason": choice.finish_reason
        }
        # Include token usage if available
        if hasattr(response, "usage") and response.usage:
            result["usage"] = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }
        return result
