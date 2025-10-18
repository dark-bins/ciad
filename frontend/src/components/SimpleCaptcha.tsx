import { useState, useEffect } from "react";

interface SimpleCaptchaProps {
  onVerify: (isValid: boolean) => void;
}

export const SimpleCaptcha = ({ onVerify }: SimpleCaptchaProps) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    generateNewChallenge();
  }, []);

  const generateNewChallenge = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setNum1(n1);
    setNum2(n2);
    setUserAnswer("");
    setIsValid(false);
    onVerify(false);
  };

  const handleAnswerChange = (value: string) => {
    setUserAnswer(value);
    const expectedAnswer = num1 + num2;
    const valid = parseInt(value) === expectedAnswer;
    setIsValid(valid);
    onVerify(valid);
  };

  return (
    <div className="captcha-container">
      <div className="captcha-question">
        <span>¿Cuánto es {num1} + {num2}?</span>
        <button type="button" onClick={generateNewChallenge} className="captcha-refresh">
          🔄
        </button>
      </div>
      <input
        type="number"
        value={userAnswer}
        onChange={(e) => handleAnswerChange(e.target.value)}
        placeholder="Respuesta"
        className={isValid ? "captcha-input-valid" : ""}
      />
    </div>
  );
};
