"""
Ollama local LLM provider implementation.
"""
import aiohttp
from typing import List, Dict, Any, Optional, Union, AsyncIterator
from .base import LLMProvider


class OllamaProvider(LLMProvider):
    """Ollama local model provider implementation."""
    
    def __init__(self, api_key: str = "", model: str = "llama3", base_url: str = "http://localhost:11434"):
        """
        Initialize Ollama provider.
        
        Args:
            api_key: Not used for Ollama (local)
            model: Model name (default: llama3)
            base_url: Ollama server URL
        """
        super().__init__(api_key, model)
        self.base_url = base_url
        self._supported_models = [
            "llama3",
            "mistral",
            "codellama",
            "phi"
        ]
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        """Generate chat completion using Ollama API."""
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature
                }
            }
            
            if max_tokens:
                payload["options"]["num_predict"] = max_tokens
            
            async with session.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=90)
            ) as response:
                result = await response.json()
                return self._format_response(result)
    
    def convert_tools_format(self, mcp_tools: List[Any]) -> List[Dict[str, Any]]:
        """Convert MCP tools to Ollama format."""
        # Ollama has limited tool support, may need to use prompt engineering
        return []
    
    def parse_tool_calls(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract tool calls from Ollama response."""
        # Ollama may not support structured tool calls
        # May need to parse from text response
        return []
    
    async def validate_api_key(self) -> bool:
        """Validate Ollama connection (no API key needed)."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    return response.status == 200
        except Exception:
            return False
    
    @property
    def supported_models(self) -> List[str]:
        """List of supported Ollama models."""
        return self._supported_models
    
    def _format_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Format Ollama response to standard format."""
        message = response.get("message", {})
        return {
            "content": message.get("content", ""),
            "role": message.get("role", "assistant"),
            "tool_calls": None,
            "finish_reason": "stop"
        }
