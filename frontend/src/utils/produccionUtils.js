// Ciclo de 10 colores en orden. Semana ISO 1 del primer ciclo = MORADO.
export const COLORES_CINTA = [
  { value: "MORADO",   label: "Morado" },
  { value: "CAFE",     label: "Café" },
  { value: "NEGRO",    label: "Negro" },
  { value: "NARANJA",  label: "Naranja" },
  { value: "VERDE",    label: "Verde" },
  { value: "AMARILLO", label: "Amarillo" },
  { value: "BLANCO",   label: "Blanco" },
  { value: "AZUL",     label: "Azul" },
  { value: "HABANO",   label: "Habano" },
  { value: "GRIS",     label: "Gris" },
];

const COLOR_CYCLE = COLORES_CINTA.map((c) => c.value);

/** Devuelve el color esperado para un numero de semana ISO (1-based). */
export function getColorParaSemana(semanaISO) {
  return COLOR_CYCLE[(semanaISO - 1) % 10];
}

/**
 * Devuelve el numero de semana ISO de una fecha.
 * Usa el algoritmo ISO 8601 (semana que contiene el jueves).
 */
export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Devuelve el anio ISO de una fecha (puede diferir del anio calendario en sem 1/52-53).
 */
export function getISOYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/** Formatea como "YYYY-WW" */
export function formatSemana(year, week) {
  return year + "-" + String(week).padStart(2, "0");
}

/**
 * Genera opciones de semana: semana actual + 4 anteriores, sin semanas futuras.
 * Devuelve array de { value: "YYYY-WW", label: "Sem WW / YYYY", colorEsperado }.
 */
export function getSemanasOpciones() {
  const hoy = new Date();
  const semanaActualNum = getISOWeek(hoy);
  const anioActual = getISOYear(hoy);

  // Construimos 5 entradas hacia atras (incluida la actual)
  const opciones = [];
  let anio = anioActual;
  let semana = semanaActualNum;

  for (let i = 0; i < 5; i++) {
    const value = formatSemana(anio, semana);
    const colorEsperado = getColorParaSemana(semana);
    opciones.push({ value, label: "Sem " + semana + " / " + anio, colorEsperado, semanaISO: semana });
    // Retroceder una semana
    semana--;
    if (semana < 1) {
      anio--;
      // Semanas del anio anterior (puede ser 52 o 53)
      const dic28 = new Date(anio, 11, 28);
      semana = getISOWeek(dic28);
    }
  }
  return opciones;  // [0] = semana actual, [4] = 4 semanas atras
}

export function getSemanaActual() {
  const hoy = new Date();
  return formatSemana(getISOYear(hoy), getISOWeek(hoy));
}
