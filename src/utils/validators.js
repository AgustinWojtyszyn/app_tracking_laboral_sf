
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    valid: regex.test(email),
    error: regex.test(email) ? null : "Email inválido"
  };
};

export const validatePassword = (password) => {
  // Min 8 chars, 1 uppercase, 1 number
  const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  const isValid = regex.test(password);
  return {
    valid: isValid,
    error: isValid ? null : "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número"
  };
};

export const validateHours = (hours) => {
  const val = Number(hours);
  return {
    valid: val > 0,
    error: val > 0 ? null : "Horas trabajadas debe ser mayor a 0"
  };
};

export const validateCost = (cost) => {
  const val = Number(cost);
  return {
    valid: val >= 0,
    error: val >= 0 ? null : "El costo debe ser mayor o igual a 0"
  };
};

export const validateAmount = (amount) => {
  const val = Number(amount);
  return {
    valid: val >= 0,
    error: val >= 0 ? null : "El monto debe ser mayor o igual a 0"
  };
};

export const validateDateRange = (from, to) => {
  if (!from || !to) return { valid: false, error: "Fechas requeridas" };
  const valid = new Date(from) <= new Date(to);
  return {
    valid,
    error: valid ? null : "La fecha de inicio debe ser anterior a la de fin"
  };
};

export const validateGroupName = (name) => {
  const valid = name && name.trim().length > 0;
  return {
    valid,
    error: valid ? null : "El nombre del grupo es requerido"
  };
};
