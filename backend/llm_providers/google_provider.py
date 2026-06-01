"""
Google Gemini LLM provider implementation.
"""
from google import genai
from typing import List, Dict, Any, Optional, Union, AsyncIterator
from .base import LLMProvider


class GoogleProvider(LLMProvider):
    """Google Gemini provider implementation."""
    
    def __init__(self, api_key: str, model: str = "gemini-pro"):
        """
        Initialize Google provider.
        
        Args:
            api_key: Google API key
            model: Model name (default: gemini-pro)
        """
        super().__init__(api_key, model)
        genai.configure(api_key=api_key)
        self._supported_models = [
            "gemini-pro",
            "gemini-pro-vision"
        ]
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        """Generate chat completion using Google Gemini API."""
        model = genai.GenerativeModel(self.model)
        
        # Convert messages to Gemini format
        gemini_messages = self._convert_messages(messages)
        
        generation_config = {
            "temperature": temperature,
        }
        
        if max_tokens:
            generation_config["max_output_tokens"] = max_tokens
        
        response = await model.generate_content_async(
            gemini_messages,
            generation_config=generation_config
        )
        
        return self._format_response(response)
    
    def convert_tools_format(self, mcp_tools: List[Any]) -> List[Dict[str, Any]]:
        """Convert MCP tools to Google function calling format."""
        google_tools = []
        
        for tool in mcp_tools:
            google_tool = {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema
            }
            google_tools.append(google_tool)
        
        return google_tools
    
    def parse_tool_calls(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract tool calls from Google response."""
        # Google Gemini tool calling format may vary
        # This is a placeholder implementation
        return []
    
    async def validate_api_key(self) -> bool:
        """Validate Google API key."""
        try:
            model = genai.GenerativeModel("gemini-pro")
            await model.generate_content_async("test")
            return True
        except Exception:
            return False
    
    @property
    def supported_models(self) -> List[str]:
        """List of supported Google models."""
        return self._supported_models
    
    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[str]:
        """Convert standard message format to Gemini format."""
        gemini_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                # Gemini doesn't have system role, prepend to first user message
                gemini_messages.insert(0, f"System: {msg['content']}")
            elif msg["role"] == "user":
                gemini_messages.append(msg["content"])
            elif msg["role"] == "assistant":
                # Handle assistant messages if needed
                pass
        
        return gemini_messages
    
    def _format_response(self, response) -> Dict[str, Any]:
        """Format Google response to standard format."""
        return {
            "content": response.text,
            "role": "assistant",
            "tool_calls": None,
            "finish_reason": "stop"
        }
