import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface SellerOrderNotificationProps {
  sellerName: string;
  orderNumber: string;
  orderDate: Date;
  productName: string;
  productImageUrl: string;
  totalFormatted: string;
  shippingAddress?: string[] | null;
  billingAddress?: string[] | null;
  ctaUrl: string;
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
};

export default function SellerOrderNotificationEmail(props: SellerOrderNotificationProps) {
  const {
    sellerName,
    orderNumber,
    orderDate,
    productName,
    productImageUrl,
    totalFormatted,
    shippingAddress,
    billingAddress,
    ctaUrl,
    logoUrl,
  } = props;

  const firstName = sellerName?.split(' ')?.[0] || 'there';
  const orderDateDisplay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(orderDate));

  const previewText = `New order #${orderNumber}`;

  const renderAddress = (lines?: string[] | null) => {
    if (!lines || lines.length === 0) {
      return <Text style={styles.muted}>Address unavailable</Text>;
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

          <Text style={styles.heading}>You sold an item, {firstName}!</Text>
          <Text style={styles.muted}>
            Order #{orderNumber} placed on {orderDateDisplay}.
          </Text>

          <Section style={{ ...styles.card, marginTop: '14px' }}>
            <Text style={{ ...styles.heading, margin: '0 0 12px' }}>Order item</Text>

            <Section style={{ ...styles.itemRow, marginBottom: '12px' }}>
              <Img
                src={productImageUrl}
                alt={productName}
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
                <Text style={styles.itemTitle}>{productName}</Text>
                <Text style={styles.itemMeta}>Quantity: 1</Text>
              </div>
              <Text style={styles.itemPrice}>{totalFormatted}</Text>
            </Section>
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
        </Container>
      </Body>
    </Html>
  );
}
