import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CheckoutFlow } from "./features/checkout/CheckoutFlow";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/checkout/*" element={<CheckoutFlow />} />
        <Route path="*" element={<Navigate to="/checkout" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
