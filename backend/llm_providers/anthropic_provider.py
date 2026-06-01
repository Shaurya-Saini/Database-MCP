"""
Anthropic Claude LLM provider implementation.
"""
import json
from typing import List, Dict, Any, Optional, Union, AsyncIterator
from anthropic import AsyncAnthropic
from .base import LLMProvider


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider implementation."""
    
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        """
        Initialize Anthropic provider.
        
        Args:
            api_key: Anthropic API key
            model: Model name (default: claude-3-5-sonnet-20241022)
        """
        super().__init__(api_key, model)
        self.client = AsyncAnthropic(api_key=api_key)
        self._supported_models = [
            "claude-3-5-sonnet-20241022",
            "claude-3-opus-20240229",
            "claude-3-haiku-20240307"
        ]
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = 4096,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        """Generate chat completion using Anthropic API."""
        # Anthropic requires system message separate
        system_message = None
        user_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            else:
                user_messages.append(msg)
        
        params = {
            "model": self.model,
            "messages": user_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "timeout": 90.0
        }
        
        if system_message:
            params["system"] = system_message
        
        if tools:
            params["tools"] = tools
        
        response = await self.client.messages.create(**params)
        return self._format_response(response)
    
    def convert_tools_format(self, mcp_tools: List[Any]) -> List[Dict[str, Any]]:
        """Convert MCP tools to Anthropic tool format."""
        anthropic_tools = []
        
        for tool in mcp_tools:
            anthropic_tool = {
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.inputSchema
            }
            anthropic_tools.append(anthropic_tool)
        
        return anthropic_tools
    
    def parse_tool_calls(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract tool calls from Anthropic response."""
        tool_calls = []
        
        content = response.get("content", [])
        for block in content:
            if block.get("type") == "tool_use":
                tool_calls.append({
                    "id": block.get("id"),
                    "name": block.get("name"),
                    "arguments": block.get("input", {})
                })
        
        return tool_calls
    
    async def validate_api_key(self) -> bool:
        """Validate Anthropic API key."""
        try:
            # Make a minimal request to validate
            await self.client.messages.create(
                model="claude-3-haiku-20240307",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1
            )
            return True
        except Exception:
            return False
    
    @property
    def supported_models(self) -> List[str]:
        """List of supported Anthropic models."""
        return self._supported_models
    
    def _format_response(self, response) -> Dict[str, Any]:
        """Format Anthropic response to standard format."""
        content_text = ""
        tool_calls = []
        
        for block in response.content:
            if block.type == "text":
                content_text += block.text
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "name": block.name,
                    "arguments": block.input
                })
        
        return {
            "content": content_text,
            "role": "assistant",
            "tool_calls": tool_calls if tool_calls else None,
            "finish_reason": response.stop_reason
        }
