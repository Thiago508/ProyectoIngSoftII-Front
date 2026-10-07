import "./CheckoutStepper.css";

type CheckoutStep = "data" | "payment" | "summary";

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
}

const steps: Array<{
  id: CheckoutStep;
  label: string;
}> = [
  { id: "data", label: "Datos y envío" },
  { id: "payment", label: "Pago" },
  { id: "summary", label: "Resumen" },
];

export function CheckoutStepper({
  currentStep,
}: CheckoutStepperProps) {
  const currentStepIndex = steps.findIndex(
    (step) => step.id === currentStep,
  );

  return (
    <ol className="checkout-stepper" aria-label="Progreso de compra">
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;

        return (
          <li
            key={step.id}
            className={`checkout-stepper__step ${
              isActive ? "checkout-stepper__step--active" : ""
            } ${
              isCompleted ? "checkout-stepper__step--completed" : ""
            }`}
            aria-current={isActive ? "step" : undefined}
          >
            <span className="checkout-stepper__number">
              {index + 1}
            </span>

            <span className="checkout-stepper__label">
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}