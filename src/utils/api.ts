// API configuration utility
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// API functions
export const api = {
  // Auth endpoints
  deleteAccount: async (token: string) => {
    try {
      console.log('🌐 Making delete account API call...');
      const response = await fetch(`${API_BASE_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Delete account response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Failed to delete account';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
          console.error('❌ Delete account API error:', error);
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('✅ Delete account API success:', result);
      return result;
    } catch (error) {
      console.error('❌ Delete account API call failed:', error);
      throw error;
    }
  },
};
