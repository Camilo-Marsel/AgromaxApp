
// ============================================
// MultipleDatePicker.jsx - MODIFICADO
// ============================================

import { useState, useEffect } from 'react';

export default function MultipleDatePicker({ 
  quincena, 
  onSelectionChange, 
  registrosExistentes = [],
  registrosDetallados = [], // NUEVO: recibe array de objetos con {fecha, labor_nombre}
  laborActualNombre = '', // NUEVO: nombre de la labor que se está registrando
  singleSelection = false
}) {
  const [selectedDates, setSelectedDates] = useState([]);
  const [diasQuincena, setDiasQuincena] = useState([]);

  useEffect(() => {
    if (!quincena) {
      setDiasQuincena([]);
      return;
    }
    
    // FIX: Usar split para evitar problemas de zona horaria
    const [yearInicio, mesInicio, diaInicio] = quincena.fecha_inicio.split('-');
    const [yearFin, mesFin, diaFin] = quincena.fecha_fin.split('-');
    
    const inicio = new Date(yearInicio, mesInicio - 1, diaInicio);
    const fin = new Date(yearFin, mesFin - 1, diaFin);
    const dias = [];

    let current = new Date(inicio);
    while (current <= fin) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const isDomingo = current.getDay() === 0;
      
      // Obtener labores de esta fecha
      const laboresEnFecha = registrosDetallados
        .filter(r => r.fecha === dateStr)
        .map(r => r.labor_nombre);
      
      const tieneRegistro = laboresEnFecha.length > 0;
      
      // Labores especiales que pueden agregarse como "adicionales" (debe coincidir con el backend)
      const LABORES_ADICIONALES = ['Control', 'Resiembra CabezaToro', 'Siembra Nueva', 'Amarre', 'Amarre 3 pitas'];

      // LÓGICA DE DESHABILITACIÓN:
      // Regla: Máximo 1 labor normal + cualquier combinación de labores adicionales
      //
      // Ejemplos válidos:
      // - Día Básico (1 normal)
      // - Día Básico + Control (1 normal + 1 adicional)
      // - Día Básico + Resiembra CabezaToro + Siembra Nueva (1 normal + 2 adicionales)
      // - Control + Resiembra CabezaToro + Siembra Nueva (3 adicionales)

      let disabled = isDomingo;
      let mensajeTooltip = '';

      if (!isDomingo && tieneRegistro) {
        // Clasificar labores existentes
        const laboresNormalesExistentes = laboresEnFecha.filter(l => !LABORES_ADICIONALES.includes(l));
        const laboresAdicionalesExistentes = laboresEnFecha.filter(l => LABORES_ADICIONALES.includes(l));

        // Si la labor actual es adicional
        if (LABORES_ADICIONALES.includes(laborActualNombre)) {
          // Verificar que no esté duplicada
          if (laboresEnFecha.includes(laborActualNombre)) {
            disabled = true;
            mensajeTooltip = `Ya tiene ${laborActualNombre} registrado.`;
          } else {
            // Puede agregarse
            disabled = false;
            mensajeTooltip = laboresEnFecha.length > 0
              ? `Tiene: ${laboresEnFecha.join(', ')}. Puede agregar ${laborActualNombre}.`
              : dateStr;
          }
        } else {
          // Es una labor normal, verificar que no haya otra labor normal
          if (laboresNormalesExistentes.length > 0) {
            disabled = true;
            mensajeTooltip = `Ya tiene: ${laboresNormalesExistentes[0]}. Solo puede agregar labores adicionales (Control, Resiembra, Siembra Nueva, Amarre, Amarre 3 pitas).`;
          } else {
            // No hay labores normales, puede agregarse
            disabled = false;
            mensajeTooltip = laboresAdicionalesExistentes.length > 0
              ? `Tiene: ${laboresAdicionalesExistentes.join(', ')}. Puede agregar esta labor.`
              : dateStr;
          }
        }
      } else if (isDomingo) {
        mensajeTooltip = 'Domingo - No disponible';
      } else {
        mensajeTooltip = dateStr;
      }

      dias.push({
        fecha: dateStr,
        dia: current.getDate(),
        diaSemana: current.toLocaleDateString('es-ES', { weekday: 'short' }),
        isDomingo,
        tieneRegistro,
        laboresEnFecha,
        disabled,
        tooltip: mensajeTooltip,
      });

      current.setDate(current.getDate() + 1);
    }

    setDiasQuincena(dias);
  }, [quincena, registrosExistentes, registrosDetallados, laborActualNombre]);

  const toggleDate = (fecha) => {
    setSelectedDates((prev) => {
      let newSelection;
      
      if (singleSelection) {
        // MODO SINGLE: Solo permite 1 fecha
        newSelection = prev.includes(fecha) ? [] : [fecha];
      } else {
        // MODO MULTIPLE: Permite varias fechas
        newSelection = prev.includes(fecha)
          ? prev.filter((d) => d !== fecha)
          : [...prev, fecha];
      }
      
      onSelectionChange(newSelection);
      return newSelection;
    });
  };

  const seleccionarTodos = () => {
    const disponibles = diasQuincena
      .filter((d) => !d.disabled)
      .map((d) => d.fecha);
    setSelectedDates(disponibles);
    onSelectionChange(disponibles);
  };

  const limpiarSeleccion = () => {
    setSelectedDates([]);
    onSelectionChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          {singleSelection ? 'Fecha *' : 'Fechas (máximo 13 días laborables)'}
        </label>
        {!singleSelection && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={seleccionarTodos}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Seleccionar disponibles
            </button>
            <button
              type="button"
              onClick={limpiarSeleccion}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {diasQuincena.map((dia) => (
          <button
            key={dia.fecha}
            type="button"
            onClick={() => !dia.disabled && toggleDate(dia.fecha)}
            disabled={dia.disabled}
            className={`
              p-2 rounded-md text-xs font-medium border transition-colors
              ${dia.isDomingo ? 'bg-red-50 text-red-400 cursor-not-allowed border-red-200' : ''}
              ${dia.tieneRegistro && dia.disabled ? 'bg-orange-50 text-orange-400 cursor-not-allowed border-orange-200' : ''}
              ${dia.tieneRegistro && !dia.disabled ? 'bg-yellow-50 text-yellow-700 border-yellow-300' : ''}
              ${selectedDates.includes(dia.fecha) ? 'bg-blue-600 text-white border-blue-600' : ''}
              ${!dia.disabled && !dia.tieneRegistro && !selectedDates.includes(dia.fecha) ? 'bg-white hover:bg-blue-50 border-gray-300' : ''}
            `}
            title={dia.tooltip}
          >
            <div className="text-center">
              <div className="text-[10px] uppercase">{dia.diaSemana}</div>
              <div className="font-bold">{dia.dia}</div>
              {dia.tieneRegistro && !dia.disabled && (
                <div className="text-[8px]">✓</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedDates.length > 0 && (
        <div className="text-sm text-gray-600">
          {selectedDates.length} día(s) seleccionado(s)
        </div>
      )}
    </div>
  );
}
