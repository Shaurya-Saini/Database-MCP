"""
Credential manager for encrypting and decrypting sensitive data.
"""
import os
from cryptography.fernet import Fernet
import base64


class CredentialManager:
    """Manages encryption/decryption of sensitive credentials."""
    
    def __init__(self, encryption_key: str = None):
        """
        Initialize credential manager.
        
        Args:
            encryption_key: Base64-encoded encryption key. If not provided,
                          will try to load from ENCRYPTION_KEY environment variable.
        """
        if encryption_key is None:
            encryption_key = os.getenv("ENCRYPTION_KEY")
            
        if not encryption_key:
            raise ValueError(
                "Encryption key not provided. Set ENCRYPTION_KEY environment variable "
                "or pass encryption_key parameter."
            )
        
        # Ensure key is bytes
        if isinstance(encryption_key, str):
            encryption_key = encryption_key.encode()
            
        self.cipher = Fernet(encryption_key)
    
    def encrypt_password(self, password: str) -> str:
        """
        Encrypt a password.
        
        Args:
            password: Plain text password
            
        Returns:
            Base64-encoded encrypted password
        """
        encrypted = self.cipher.encrypt(password.encode())
        return base64.b64encode(encrypted).decode()
    
    def decrypt_password(self, encrypted_password: str) -> str:
        """
        Decrypt a password.
        
        Args:
            encrypted_password: Base64-encoded encrypted password
            
        Returns:
            Plain text password
        """
        encrypted = base64.b64decode(encrypted_password.encode())
        decrypted = self.cipher.decrypt(encrypted)
        return decrypted.decode()
    
    @staticmethod
    def generate_key() -> str:
        """
        Generate a new encryption key.
        
        Returns:
            Base64-encoded encryption key
        """
        return Fernet.generate_key().decode()
