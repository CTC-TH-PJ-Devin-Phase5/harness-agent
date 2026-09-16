import React from 'react';
import { LanguageProvider } from '@/modules/auth/hooks/useLang';
import { LoginPage } from '@/modules/auth/pages/LoginPage';

function App() {
  return (
    <LanguageProvider>
      <LoginPage onAuthSuccess={console.log} />
    </LanguageProvider>
  );
}

export default App;
