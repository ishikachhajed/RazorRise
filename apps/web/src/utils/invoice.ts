import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceItem {
  productName?: string;
  name?: string;
  quantity?: number;
  price?: number;
  subtotal?: number;
}

export interface InvoiceData {
  orderId: string;
  paymentId?: string;
  razorpayOrderId?: string;
  amount: number;
  items: InvoiceItem[];
  createdAt?: string;
  paymentStatus?: string;
}

function formatInvoiceDate(value?: string): string {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function downloadInvoice(data: InvoiceData): void {
  const doc = new jsPDF();
  const orderNumber = data.orderId.slice(-6).toUpperCase();
  const paymentReference = data.paymentId || data.razorpayOrderId || 'Not available';
  const paymentStatus = (data.paymentStatus || 'paid').toUpperCase();

  doc.setFontSize(22);
  doc.setTextColor(40, 54, 24);
  doc.text('RazorRise Commerce', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(139, 139, 139);
  doc.text('Adaptive Commerce - Powered by Razorpay', 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(40, 54, 24);
  doc.text(`Order ID: #${orderNumber}`, 14, 45);
  doc.text(`Payment Reference: ${paymentReference}`, 14, 52);
  doc.text(`Date: ${formatInvoiceDate(data.createdAt)}`, 14, 59);
  doc.text(`Status: ${paymentStatus}`, 14, 66);

  const tableRows = data.items.map((item) => {
    const quantity = item.quantity || 1;
    const subtotal = item.subtotal ?? ((item.price || 0) * quantity);
    const unitPrice = quantity > 0 ? subtotal / quantity : subtotal;
    return [
      item.productName || item.name || 'Product',
      quantity.toString(),
      `Rs. ${unitPrice.toLocaleString('en-IN')}`,
      `Rs. ${subtotal.toLocaleString('en-IN')}`
    ];
  });

  autoTable(doc, {
    head: [['Product', 'Qty', 'Unit Price (INR)', 'Amount (INR)']],
    body: tableRows,
    startY: 75,
    theme: 'grid',
    styles: { fontSize: 10, textColor: [40, 54, 24] },
    headStyles: { fillColor: [212, 212, 212], textColor: [40, 54, 24] }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 90;
  doc.setFontSize(14);
  doc.setTextColor(40, 54, 24);
  doc.text(`Total Paid: Rs. ${data.amount.toLocaleString('en-IN')}`, 14, finalY + 15);

  doc.setFontSize(9);
  doc.setTextColor(139, 139, 139);
  doc.text('This is a computer-generated invoice.', 14, finalY + 30);

  doc.save(`Invoice_RazorRise_${orderNumber}.pdf`);
}
