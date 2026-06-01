"""
Base class for LLM providers.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncIterator, Union


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    def __init__(self, api_key: str, model: str):
        """
        Initialize LLM provider.
        
        Args:
            api_key: API key for the provider
            model: Model name to use
        """
        self.api_key = api_key
        self.model = model
    
    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        """
        Generate a chat completion.
        
        Args:
            messages: Conversation history
            tools: Available tools/functions
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
            
        Returns:
            Completion response or async iterator for streaming
        """
        pass
    
    @abstractmethod
    def convert_tools_format(self, mcp_tools: List[Any]) -> List[Dict[str, Any]]:
        """
        Convert MCP tools to provider-specific format.
        
        Args:
            mcp_tools: MCP tools
            
        Returns:
            Provider-specific tool format
        """
        pass
    
    @abstractmethod
    def parse_tool_calls(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract tool calls from provider response.
        
        Args:
            response: Provider response
            
        Returns:
            List of tool calls with id, name, and arguments
        """
        pass
    
    @abstractmethod
    async def validate_api_key(self) -> bool:
        """
        Validate the API key for this provider.
        
        Returns:
            True if valid, False otherwise
        """
        pass
    
    @property
    @abstractmethod
    def supported_models(self) -> List[str]:
        """
        List of supported models for this provider.
        
        Returns:
            List of model names
        """
        pass
