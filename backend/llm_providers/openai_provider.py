"""
OpenAI LLM provider implementation.
"""
import json
from typing import List, Dict, Any, Optional, Union, AsyncIterator
from openai import AsyncOpenAI
from .base import LLMProvider


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider implementation."""
    
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        """
        Initialize OpenAI provider.
        
        Args:
            api_key: OpenAI API key
            model: Model name (default: gpt-4o)
        """
        super().__init__(api_key, model)
        self.client = AsyncOpenAI(api_key=api_key)
        self._supported_models = [
            "gpt-4o",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo"
        ]
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        """Generate chat completion using OpenAI API."""
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
        
        if stream:
            return self._stream_completion(params)
        else:
            response = await self.client.chat.completions.create(**params)
            return self._format_response(response)
    
    def convert_tools_format(self, mcp_tools: List[Any]) -> List[Dict[str, Any]]:
        """Convert MCP tools to OpenAI function calling format."""
        openai_tools = []
        
        for tool in mcp_tools:
            openai_tool = {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.inputSchema
                }
            }
            openai_tools.append(openai_tool)
        
        return openai_tools
    
    def parse_tool_calls(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract tool calls from OpenAI response."""
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
        """Validate OpenAI API key."""
        try:
            await self.client.models.list()
            return True
        except Exception:
            return False
    
    @property
    def supported_models(self) -> List[str]:
        """List of supported OpenAI models."""
        return self._supported_models
    
    def _format_response(self, response) -> Dict[str, Any]:
        """Format OpenAI response to standard format."""
        choice = response.choices[0]
        return {
            "content": choice.message.content,
            "role": choice.message.role,
            "tool_calls": choice.message.tool_calls if hasattr(choice.message, "tool_calls") else None,
            "finish_reason": choice.finish_reason
        }
    
    async def _stream_completion(self, params: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
        """Stream completion responses."""
        params["stream"] = True
        stream = await self.client.chat.completions.create(**params)
        
        async for chunk in stream:
            if chunk.choices:
                delta = chunk.choices[0].delta
                yield {
                    "content": delta.content if hasattr(delta, "content") else None,
                    "role": delta.role if hasattr(delta, "role") else None,
                    "finish_reason": chunk.choices[0].finish_reason
                }
