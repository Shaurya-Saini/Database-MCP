"""
Google Gemini LLM provider implementation (using OpenAI SDK compatibility).
"""
import json
from typing import List, Dict, Any, Optional, Union, AsyncIterator
try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None
from .base import LLMProvider


class GeminiProvider(LLMProvider):
    """Google Gemini provider implementation via OpenAI compatibility endpoint."""
    
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        """
        Initialize Gemini provider.
        
        Args:
            api_key: Gemini API key
            model: Model name (default: gemini-2.5-flash)
        """
        super().__init__(api_key, model)
        
        if AsyncOpenAI is None:
            raise ImportError(
                "OpenAI SDK not installed. Install with: pip install openai"
            )
            
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        self._supported_models = [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
        ]
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        """Generate chat completion using Gemini API via OpenAI client."""
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
        """Convert MCP tools to OpenAI/Gemini function calling format."""
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
        """Extract tool calls from Gemini response."""
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
        """Validate Gemini API key."""
        try:
            await self.client.models.list()
            return True
        except Exception:
            return False
    
    @property
    def supported_models(self) -> List[str]:
        """List of supported Gemini models."""
        return self._supported_models
    
    def _format_response(self, response) -> Dict[str, Any]:
        """Format Gemini response to standard format."""
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
