import styled from 'styled-components';

const Container = styled.div`
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
`;

const Icon = styled.div`
  color: var(--color-error);
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
`;

const Content = styled.div`
  flex: 1;
`;

const Title = styled.h4`
  color: var(--color-error);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 var(--spacing-xs) 0;
`;

const Message = styled.p`
  color: #991b1b;
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
`;

interface ErrorBoxProps {
  message: string;
  title?: string;
}

export function ErrorBox({ message, title = 'Validation Error' }: ErrorBoxProps): JSX.Element {
  return (
    <Container>
      <Icon>⚠️</Icon>
      <Content>
        <Title>{title}</Title>
        <Message>{message}</Message>
      </Content>
    </Container>
  );
}
