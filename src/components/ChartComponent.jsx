import * as React from 'react';

export default function ChartComponent({ data, type = 'bar', title, height = 300 }) {
  const canvasRef = React.useRef(null);
  const [chart, setChart] = React.useState(null);

  React.useEffect(() => {
    if (!data || !canvasRef.current) return;

    // Limpiar canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Configurar canvas
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Obtener dimensiones
    const width = canvas.offsetWidth;
    const height_ = height;
    const padding = 40;

    // Preparar datos
    const labels = Object.keys(data);
    const values = Object.values(data);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    // Colores
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
    ];

    // Dibujar gráfico de barras
    if (type === 'bar') {
      const barWidth = (width - padding * 2) / labels.length * 0.8;
      const barSpacing = (width - padding * 2) / labels.length * 0.2;

      // Dibujar ejes
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height_ - padding);
      ctx.lineTo(width - padding, height_ - padding);
      ctx.stroke();

      // Dibujar barras
      labels.forEach((label, index) => {
        const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
        const barHeight = ((values[index] - minValue) / (maxValue - minValue)) * (height_ - padding * 2);
        const y = height_ - padding - barHeight;

        // Barra
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barWidth, barHeight);

        // Etiqueta
        ctx.fillStyle = '#374151';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + barWidth / 2, height_ - padding + 20);

        // Valor
        ctx.fillStyle = '#6B7280';
        ctx.font = '10px system-ui';
        ctx.fillText(values[index], x + barWidth / 2, y - 5);
      });
    }

    // Dibujar gráfico de líneas
    if (type === 'line') {
      const pointSpacing = (width - padding * 2) / (labels.length - 1);

      // Dibujar ejes
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height_ - padding);
      ctx.lineTo(width - padding, height_ - padding);
      ctx.stroke();

      // Dibujar línea
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      labels.forEach((label, index) => {
        const x = padding + index * pointSpacing;
        const y = height_ - padding - ((values[index] - minValue) / (maxValue - minValue)) * (height_ - padding * 2);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        // Punto
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.stroke();

      // Etiquetas
      labels.forEach((label, index) => {
        const x = padding + index * pointSpacing;
        ctx.fillStyle = '#374151';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, height_ - padding + 20);
      });
    }

    // Dibujar gráfico de dona
    if (type === 'doughnut') {
      const centerX = width / 2;
      const centerY = height_ / 2;
      const radius = Math.min(width, height_) / 2 - padding;
      const innerRadius = radius * 0.6;

      const total = values.reduce((sum, value) => sum + value, 0);
      let currentAngle = -Math.PI / 2;

      labels.forEach((label, index) => {
        const sliceAngle = (values[index] / total) * 2 * Math.PI;

        // Sector
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();

        // Agujero interno
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Etiqueta
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelRadius = radius * 0.8;
        const labelX = centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius;

        ctx.fillStyle = '#374151';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX, labelY);

        currentAngle += sliceAngle;
      });

      // Valor central
      ctx.fillStyle = '#374151';
      ctx.font = '16px system-ui font-bold';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(total, centerX, centerY);
    }

  }, [data, type, height]);

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No hay datos disponibles
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="border border-border rounded-lg"
      />
    </div>
  );
} 