/**
 * WhatsApp sólo permite enviar mensajes de texto libre dentro de la
 * "customer service window": una ventana que se abre con el último
 * mensaje del CONTACTO (no del bot) y dura 24 horas. Aquí se usa un
 * margen de 23 horas para evitar enviar justo al límite.
 */
export const SERVICE_WINDOW_HOURS = 23;

export type ServiceWindow = {
  open: boolean;
  expiresAt: string | null;
};

export function getServiceWindow(lastContactAt: string | null): ServiceWindow {
  if (!lastContactAt) {
    return { open: false, expiresAt: null };
  }

  const lastMs = new Date(lastContactAt).getTime();
  if (Number.isNaN(lastMs)) {
    return { open: false, expiresAt: null };
  }

  const expiresAtMs = lastMs + SERVICE_WINDOW_HOURS * 60 * 60 * 1000;

  return {
    open: Date.now() < expiresAtMs,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}
