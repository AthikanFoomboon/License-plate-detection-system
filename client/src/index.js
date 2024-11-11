import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import store, { persistor } from './store';
import { PersistGate } from 'redux-persist/integration/react';  // นำเข้า PersistGate

const root = createRoot(document.getElementById('root'));

root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>  {/* ใช้ PersistGate */}
      <HashRouter> 
        <App />
      </HashRouter>
    </PersistGate>
  </Provider>
);
