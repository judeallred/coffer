import styled from 'styled-components';

const HeaderContainer = styled.header`
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-lg) 0;
  box-shadow: var(--shadow-sm);
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (min-width: 768px) {
    padding: 0 var(--spacing-lg);
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0;
  
  @media (max-width: 767px) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  color: var(--color-text-light);
  margin: var(--spacing-xs) 0 0 0;
  font-size: 0.875rem;
`;

const Logo = styled.div`
  display: flex;
  flex-direction: column;
`;

const Version = styled.span`
  color: var(--color-text-light);
  font-size: 0.75rem;
  font-weight: 400;
  background: var(--color-background);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
`;

export function Header(): JSX.Element {
  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo>
          <Title>Coffer</Title>
          <Subtitle>Combine Chia offers with ease</Subtitle>
        </Logo>
        <Version>v0.1.0</Version>
      </HeaderContent>
    </HeaderContainer>
  );
}
