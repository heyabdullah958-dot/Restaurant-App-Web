import { AdminOrder } from './api';

type AlertListener = (orders: AdminOrder[]) => void;
type DismissListener = () => void;

class NewOrderAlertService {
  private alertListeners: AlertListener[] = [];
  private dismissListeners: DismissListener[] = [];
  private _pendingOrders: AdminOrder[] = [];

  get pendingOrders(): AdminOrder[] {
    return this._pendingOrders;
  }

  onAlert(listener: AlertListener): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter((l) => l !== listener);
    };
  }

  onDismiss(listener: DismissListener): () => void {
    this.dismissListeners.push(listener);
    return () => {
      this.dismissListeners = this.dismissListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Trigger alert with new orders.
   * Can be called by polling hook (Phase 3) or FCM onMessage handler (Future).
   */
  triggerAlert(newOrders: AdminOrder[]): void {
    if (!newOrders || newOrders.length === 0) return;

    // Filter to received status only
    const receivedOrders = newOrders.filter((o) => o.status === 'received');
    if (receivedOrders.length === 0) return;

    // Avoid duplicate orders in pending list
    const existingIds = new Set(this._pendingOrders.map((o) => o.id));
    const uniqueNew = receivedOrders.filter((o) => !existingIds.has(o.id));

    if (uniqueNew.length > 0) {
      this._pendingOrders = [...this._pendingOrders, ...uniqueNew];
      this.alertListeners.forEach((l) => l(this._pendingOrders));
    }
  }

  /**
   * Dismiss all alerts and stop sound
   */
  clearAlert(): void {
    this._pendingOrders = [];
    this.dismissListeners.forEach((l) => l());
  }

  /**
   * Remove a specific order after individual accept/dismiss
   */
  removeOrder(orderId: number): void {
    this._pendingOrders = this._pendingOrders.filter((o) => o.id !== orderId);
    if (this._pendingOrders.length === 0) {
      this.dismissListeners.forEach((l) => l());
    } else {
      this.alertListeners.forEach((l) => l(this._pendingOrders));
    }
  }
}

export const alertService = new NewOrderAlertService();
