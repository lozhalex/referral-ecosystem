import { useState } from 'react';

interface Step {
  title: string;
  text: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  iconType?: 'emoji' | 'logo';
}

interface OnboardingModalProps {
  steps: Step[];
  storageKey: string;
  onComplete: () => void;
}

export default function OnboardingModal({ steps, storageKey, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem(storageKey, 'true');
      onComplete();
    }
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const hasSecondaryAction = isLastStep && step.secondaryActionLabel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/90 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-md p-8 border border-white/10 shadow-2xl relative">
        {/* Индикатор прогресса */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                idx <= currentStep ? 'bg-neon-purple shadow-[0_0_8px_#A855F7]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Иконка/логотип */}
        <div className="mb-4 flex justify-center">
          {step.iconType === 'logo' ? (
            <img src="/logo-mark.svg" alt="Бумеранг" className="w-16 h-16" />
          ) : (
            <div className="text-4xl">{step.title.split(' ')[0]}</div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-4 font-display tracking-tight text-center">
          {step.iconType === 'logo' ? step.title : step.title.replace(/^[^\s]+\s/, '')}
        </h2>
        <p className="text-slate-300 mb-8 leading-relaxed text-base text-center">
          {step.text}
        </p>

        {/* Кнопки */}
        {hasSecondaryAction ? (
          <div className="space-y-3">
            <button
              onClick={handleNext}
              className="w-full py-3.5 px-4 rounded-xl text-white font-bold transition btn-neon flex items-center justify-center gap-2"
            >
              {step.actionLabel || 'Начать'}
            </button>
            <button
              onClick={() => {
                if (step.onSecondaryAction) step.onSecondaryAction();
                else {
                  localStorage.setItem(storageKey, 'true');
                  onComplete();
                }
              }}
              className="w-full py-3 px-4 rounded-xl text-cyan-400 font-medium transition bg-white/5 border border-white/10 hover:bg-white/10"
            >
              {step.secondaryActionLabel}
            </button>
          </div>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold transition btn-neon flex items-center justify-center gap-2"
          >
            {isLastStep ? (step.actionLabel || 'Начать') : 'Далее →'}
          </button>
        )}
      </div>
    </div>
  );
}