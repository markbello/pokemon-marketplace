import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export type OrderConfirmationItem = {
  name: string;
  image?: string | null;
  condition?: string | null;
  price: string;
  quantity: number;
};

export interface OrderConfirmationProps {
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  items: OrderConfirmationItem[];
  subtotal: string;
  tax?: string | null;
  shipping?: string | null;
  total: string;
  shippingAddress?: string[] | null;
  billingAddress?: string[] | null;
  ctaUrl: string;
  supportEmail: string;
  logoUrl: string;
}

const styles = {
  body: {
    backgroundColor: '#f5f5f5',
    color: '#111827',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    margin: 0,
    padding: '24px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
    margin: '0 auto',
    maxWidth: '640px',
    padding: '32px 28px',
  },
  logo: {
    height: '32px',
    marginBottom: '16px',
  },
  heading: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 8px',
  },
  muted: {
    color: '#4b5563',
    fontSize: '14px',
    margin: '0',
    lineHeight: '20px',
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '20px',
    backgroundColor: '#fafafa',
  },
  itemRow: {
    display: 'grid',
    gridTemplateColumns: '96px 1fr auto',
    columnGap: '16px',
    rowGap: '4px',
    alignItems: 'start',
    width: '100%',
  },
  itemTitle: {
    fontSize: '15px',
    fontWeight: 600,
    margin: '0 0 4px',
  },
  itemMeta: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0',
  },
  itemPrice: {
    fontSize: '15px',
    fontWeight: 600,
    margin: 0,
    textAlign: 'right' as const,
  },
  totalsTable: {
    width: '100%',
    marginTop: '10px',
    fontSize: '14px',
    borderCollapse: 'collapse' as const,
  },
  totalRow: {
    fontWeight: 700,
    fontSize: '15px',
  },
  addressBlock: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: '#ffffff',
  },
  ctaButton: {
    backgroundColor: '#111827',
    borderRadius: '10px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 600,
    padding: '14px 24px',
    textDecoration: 'none',
  },
  footer: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '24px',
    lineHeight: '18px',
  },
};

export default function OrderConfirmationEmail(props: OrderConfirmationProps) {
  const {
    customerName,
    orderNumber,
    orderDate,
    items,
    subtotal,
    tax,
    shipping,
    total,
    shippingAddress,
    billingAddress,
    ctaUrl,
    supportEmail,
    logoUrl,
  } = props;

  const firstName = customerName?.split(' ')?.[0] || 'there';
  const orderDateDisplay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(orderDate));

  const previewText = `Thanks for your order, ${firstName}! Order #${orderNumber}`;

  const renderAddress = (lines?: string[] | null) => {
    if (!lines || lines.length === 0) {
      return <Text style={styles.muted}>No address provided</Text>;
    }

    return (
      <div>
        {lines.map((line, idx) => (
          <Text key={idx} style={{ ...styles.muted, margin: '0' }}>
            {line}
          </Text>
        ))}
      </div>
    );
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Img src={logoUrl} alt="Kado.io" style={styles.logo} />

          <Text style={styles.heading}>Thanks for your order, {firstName}!</Text>
          <Text style={styles.muted}>
            We&apos;re getting your cards ready. Below are the details of your purchase. You can
            view your order anytime from the button below.
          </Text>

          <Section style={styles.card}>
            <Text style={{ ...styles.heading, margin: '0 0 12px' }}>Order details</Text>
            <Text style={styles.muted}>&#35;{orderNumber}</Text>
            <Text style={styles.muted}>Placed on {orderDateDisplay}</Text>
          </Section>

          <Section style={{ ...styles.card, marginTop: '14px' }}>
            <Text style={{ ...styles.heading, margin: '0 0 12px' }}>Items</Text>

            {items.map((item, idx) => (
              <Section
                key={`${item.name}-${idx}`}
                style={{
                  ...styles.itemRow,
                  marginBottom: idx === items.length - 1 ? '0' : '12px',
                }}
              >
                <Img
                  src={item.image || ''}
                  alt={item.name}
                  width={96}
                  height={96}
                  style={{
                    borderRadius: '12px',
                    objectFit: 'contain',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    padding: '8px',
                  }}
                />
                <div>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  {item.condition ? (
                    <Text style={styles.itemMeta}>Condition: {item.condition}</Text>
                  ) : null}
                  <Text style={styles.itemMeta}>Quantity: {item.quantity}</Text>
                </div>
                <Text style={styles.itemPrice}>{item.price}</Text>
              </Section>
            ))}

            <Hr style={{ borderColor: '#e5e7eb', margin: '16px 0' }} />

            <table style={styles.totalsTable}>
              <tbody>
                <tr>
                  <td style={{ color: '#4b5563' }}>Subtotal</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{subtotal}</td>
                </tr>
                <tr>
                  <td style={{ color: '#4b5563' }}>Tax</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{tax ?? 'Included'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#4b5563' }}>Shipping</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{shipping ?? 'Free'}</td>
                </tr>
                <tr>
                  <td style={{ paddingTop: '8px', ...styles.totalRow }}>Total</td>
                  <td style={{ paddingTop: '8px', ...styles.totalRow, textAlign: 'right' }}>
                    {total}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{ ...styles.card, marginTop: '14px' }}>
            <Text style={{ ...styles.heading, margin: '0 0 10px' }}>Shipping address</Text>
            <div style={styles.addressBlock}>{renderAddress(shippingAddress)}</div>
          </Section>

          <Section style={{ ...styles.card, marginTop: '14px' }}>
            <Text style={{ ...styles.heading, margin: '0 0 10px' }}>Billing address</Text>
            <div style={styles.addressBlock}>{renderAddress(billingAddress)}</div>
          </Section>

          <Section style={{ textAlign: 'center', marginTop: '24px' }}>
            <Button href={ctaUrl} style={styles.ctaButton}>
              View order details
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0 16px' }} />

          <Text style={styles.footer}>
            Need help? Email us at <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>.
            <br />
            This email was sent by Kado.io regarding your recent purchase.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
