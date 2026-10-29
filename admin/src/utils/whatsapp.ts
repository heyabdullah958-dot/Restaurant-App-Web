/**
 * WhatsApp Rider Dispatch Link Generator
 * Formats full order details including [+Add-on Modifiers] and Kitchen Notes.
 */

export interface RiderContact {
  name: string;
  phone: string;
}

export function generateWhatsAppDispatchLink(order: any, riderObj: RiderContact): string {
  let targetPhone = riderObj.phone.replace(/[^0-9]/g, '');
  if (targetPhone.startsWith('03') && targetPhone.length === 11) {
    targetPhone = '92' + targetPhone.substring(1);
  }

  const name = order.guest_name || order.user_or_guest || 'Customer';
  const phone = order.guest_phone || 'N/A';
  const address = order.delivery_address || 'N/A';

  const hasCoords = order.delivery_lat != null && order.delivery_lng != null;
  const locationLink = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(address)}`;

  const itemsList = (order.items || []).map((i: any) => {
    let itemStr = `• ${i.quantity || 1}x ${i.menu_item_name || i.name || 'Item'}`;
    const opts = i.selected_options || i.selectedOptions || [];
    if (Array.isArray(opts) && opts.length > 0) {
      const optTags = opts
        .map((o: any) => `[+${o.name || 'Add-on'}${Number(o.price_modifier || 0) > 0 ? ` Rs.${Number(o.price_modifier).toFixed(0)}` : ''}]`)
        .join(' ');
      itemStr += ` ${optTags}`;
    }
    const notes = (i.special_notes || i.specialNotes || '').trim();
    if (notes) {
      itemStr += `\n   📝 Kitchen Note: "${notes}"`;
    }
    return itemStr;
  }).join('\n');

  const orderLabel = order.display_order_id || `#${order.id}`;
  const isCOD = (order.payment_method || 'cod').toLowerCase() === 'cod';
  const cashStatusNotice = isCOD
    ? (order.cod_settled ? `*Cash Status:* ✅ SETTLED AT REGISTER\n\n` : `*Cash Status:* ⏳ COLLECT CASH FROM CUSTOMER\n\n`)
    : `*Payment Status:* ✅ PREPAID ONLINE\n\n`;

  const message = 
    `🛵 *FOODSPHERE DISPATCH ORDER ${orderLabel}*\n\n` +
    `*Assigned Rider:* ${riderObj.name} (${riderObj.phone})\n` +
    `*Restaurant:* ${order.restaurant_name || ''}\n` +
    `*Branch:* ${order.branch_name || 'Main'} Branch\n\n` +
    `*Customer Name:* ${name}\n` +
    `*Customer Phone:* ${phone}\n` +
    `*Delivery Address:* ${address}\n` +
    `*Google Maps Location:* ${locationLink}\n\n` +
    `*Items Ordered:*\n${itemsList}\n\n` +
    `*Total Collection:* Rs. ${order.total} (${(order.payment_method || 'COD').toUpperCase()})\n` +
    cashStatusNotice +
    `Please pick up from kitchen and deliver promptly!`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${targetPhone}?text=${encodedMessage}`;
}
