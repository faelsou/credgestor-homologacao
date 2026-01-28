import React, { useState, useEffect } from 'react';

interface DateInputProps {
  value: string; // Formato YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * Componente de input de data que permite digitação manual de números
 * Aceita formato DD/MM/YYYY durante a digitação e converte para YYYY-MM-DD
 */
export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'DD/MM/AAAA',
  required = false
}) => {
  // Converter YYYY-MM-DD para DD/MM/YYYY para exibição
  const formatForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  // Converter DD/MM/YYYY para YYYY-MM-DD
  const formatForValue = (displayStr: string): string => {
    // Remove tudo que não é número
    const numbers = displayStr.replace(/\D/g, '');
    
    if (numbers.length === 0) return '';
    
    // Limitar a 8 dígitos (DDMMYYYY)
    const limited = numbers.slice(0, 8);
    
    // Formatar como DD/MM/YYYY para exibição
    let formatted = limited;
    if (limited.length > 2) {
      formatted = `${limited.slice(0, 2)}/${limited.slice(2)}`;
    }
    if (limited.length > 4) {
      formatted = `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
    
    return formatted;
  };

  const [displayValue, setDisplayValue] = useState<string>(formatForDisplay(value));

  // Atualizar display quando value mudar externamente
  useEffect(() => {
    setDisplayValue(formatForDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Se estiver vazio, limpar
    if (inputValue === '') {
      setDisplayValue('');
      onChange('');
      return;
    }
    
    // Formatar enquanto digita
    const formatted = formatForValue(inputValue);
    setDisplayValue(formatted);
    
    // Se tiver 8 dígitos e for uma data válida, converter para YYYY-MM-DD
    const numbers = inputValue.replace(/\D/g, '');
    if (numbers.length === 8) {
      const day = numbers.slice(0, 2);
      const month = numbers.slice(2, 4);
      const year = numbers.slice(4, 8);
      
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      // Validação básica
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
        // Validação adicional: verificar se a data é válida
        const date = new Date(yearNum, monthNum - 1, dayNum);
        if (date.getFullYear() === yearNum && date.getMonth() === monthNum - 1 && date.getDate() === dayNum) {
          // Formatar com zeros à esquerda se necessário
          const dayFormatted = day.padStart(2, '0');
          const monthFormatted = month.padStart(2, '0');
          const dateValue = `${year}-${monthFormatted}-${dayFormatted}`;
          onChange(dateValue);
        }
      }
    }
  };

  const handleBlur = () => {
    // Ao perder o foco, garantir que o valor está correto
    const numbers = displayValue.replace(/\D/g, '');
    if (numbers.length === 8) {
      const day = numbers.slice(0, 2);
      const month = numbers.slice(2, 4);
      const year = numbers.slice(4, 8);
      
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
        // Validação adicional: verificar se a data é válida
        const date = new Date(yearNum, monthNum - 1, dayNum);
        if (date.getFullYear() === yearNum && date.getMonth() === monthNum - 1 && date.getDate() === dayNum) {
          // Formatar com zeros à esquerda se necessário
          const dayFormatted = day.padStart(2, '0');
          const monthFormatted = month.padStart(2, '0');
          const dateValue = `${year}-${monthFormatted}-${dayFormatted}`;
          onChange(dateValue);
          setDisplayValue(formatForDisplay(dateValue));
        } else {
          // Se a data for inválida, resetar para o valor original
          setDisplayValue(formatForDisplay(value));
        }
      } else {
        // Se a data for inválida, resetar para o valor original
        setDisplayValue(formatForDisplay(value));
      }
    } else if (numbers.length > 0 && numbers.length < 8) {
      // Se tiver algum número mas não 8, resetar
      setDisplayValue(formatForDisplay(value));
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      maxLength={10}
      className={className}
      inputMode="numeric"
      pattern="[0-9/]*"
      autoComplete="off"
    />
  );
};
