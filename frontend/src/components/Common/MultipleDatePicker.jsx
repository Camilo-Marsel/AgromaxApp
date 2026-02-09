
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
      
      // Pares de labores que pueden coexistir (debe coincidir con el backend)
      const PARES_PERMITIDOS = [
        ['Resiembra CabezaToro', 'Siembra Nueva'],
      ];

      // LÓGICA DE DESHABILITACIÓN:
      // 1. Domingos siempre deshabilitados
      // 2. Si la labor actual es "Control", NUNCA deshabilitar (puede agregarse siempre)
      // 3. Si la fecha tiene labores:
      //    - Si solo tiene "Control", permitir agregar cualquier labor
      //    - Si las labores forman un par permitido, permitir
      //    - Si tiene otras labores (no Control), solo permitir agregar "Control"

      let disabled = isDomingo;
      let mensajeTooltip = '';

      if (!isDomingo && tieneRegistro) {
        const soloTieneControl = laboresEnFecha.every(l => l === 'Control');
        const tieneOtrasLabores = laboresEnFecha.some(l => l !== 'Control');

        if (laborActualNombre === 'Control') {
          // Control SIEMPRE puede agregarse
          disabled = false;
          mensajeTooltip = tieneRegistro ? `Tiene: ${laboresEnFecha.join(', ')}` : dateStr;
        } else {
          // Verificar si la combinación actual + existente forma un par permitido
          const laboresSet = [laborActualNombre, ...laboresEnFecha.filter(l => l !== 'Control')];
          const esPar = PARES_PERMITIDOS.some(par => {
            return laboresSet.length === par.length &&
                   laboresSet.every(l => par.includes(l));
          });

          if (esPar) {
            // Es un par permitido, puede agregarse
            disabled = false;
            mensajeTooltip = `Tiene: ${laboresEnFecha.join(', ')}. Par permitido.`;
          } else if (soloTieneControl) {
            // Solo tiene Control, puede agregar esta labor
            disabled = false;
            mensajeTooltip = `Tiene Control. Puede agregar otra labor.`;
          } else if (tieneOtrasLabores) {
            // Tiene otras labores y no es un par permitido
            disabled = true;
            mensajeTooltip = `Ya tiene: ${laboresEnFecha.join(', ')}. Solo puede agregar Control.`;
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
