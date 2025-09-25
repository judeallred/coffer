import { useState } from 'preact/hooks';
import styled from 'styled-components';
import type { LogEntry } from '../types/index.ts';

const Container = styled.section<{ $hasErrors: boolean }>`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  transform: ${props => props.$hasErrors ? 'translateY(0)' : 'translateY(100%)'};
  transition: transform 0.3s ease;
`;

const Header = styled.button`
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 600;

  &:hover {
    background-color: var(--color-background);
  }

  &:focus {
    outline: none;
    background-color: var(--color-background);
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
`;

const StatusIndicator = styled.div<{ $type: 'error' | 'warning' | 'info' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => {
    switch (props.$type) {
      case 'error': return 'var(--color-error)';
      case 'warning': return 'var(--color-warning)';
      case 'info': return 'var(--color-primary)';
      default: return 'var(--color-secondary)';
    }
  }};
  animation: ${props => props.$type === 'error' ? 'pulse 2s infinite' : 'none'};

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const LogTitle = styled.span`
  color: var(--color-text);
`;

const LogCount = styled.span`
  color: var(--color-text-light);
  font-weight: 400;
`;

const ExpandIcon = styled.span<{ $isExpanded: boolean }>`
  transform: ${props => props.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
  font-size: 0.75rem;
`;

const LogContent = styled.div<{ $isExpanded: boolean }>`
  max-height: ${props => props.$isExpanded ? '300px' : '0'};
  overflow-y: auto;
  transition: max-height 0.3s ease;
`;

const LogList = styled.div`
  padding: 0 var(--spacing-lg) var(--spacing-md);
`;

const LogEntry = styled.div<{ $type: 'error' | 'warning' | 'info' }>`
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  border-radius: var(--radius-sm);
  background-color: ${props => {
    switch (props.$type) {
      case 'error': return '#fef2f2';
      case 'warning': return '#fefbf2';
      case 'info': return '#f0f9ff';
      default: return 'var(--color-background)';
    }
  }};
  border-left: 3px solid ${props => {
    switch (props.$type) {
      case 'error': return 'var(--color-error)';
      case 'warning': return 'var(--color-warning)';
      case 'info': return 'var(--color-primary)';
      default: return 'var(--color-secondary)';
    }
  }};

  &:last-child {
    margin-bottom: 0;
  }
`;

const LogIcon = styled.span`
  font-size: 0.875rem;
  line-height: 1;
  margin-top: 2px;
`;

const LogDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const LogMessage = styled.div<{ $type: 'error' | 'warning' | 'info' }>`
  font-size: 0.875rem;
  line-height: 1.4;
  color: ${props => {
    switch (props.$type) {
      case 'error': return '#991b1b';
      case 'warning': return '#92400e';
      case 'info': return '#1e40af';
      default: return 'var(--color-text)';
    }
  }};
  word-break: break-word;
`;

const LogTimestamp = styled.div`
  font-size: 0.75rem;
  color: var(--color-text-light);
  margin-top: var(--spacing-xs);
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;

  &:hover {
    color: var(--color-text);
    background-color: var(--color-background);
  }

  &:focus {
    outline: none;
    color: var(--color-text);
    background-color: var(--color-background);
  }
`;


interface ErrorLogProps {
  logs: LogEntry[];
}

const getLogIcon = (type: 'error' | 'warning' | 'info'): string => {
  switch (type) {
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '📝';
  }
};

const getMostSevereType = (logs: LogEntry[]): 'error' | 'warning' | 'info' => {
  if (logs.some(log => log.type === 'error')) return 'error';
  if (logs.some(log => log.type === 'warning')) return 'warning';
  return 'info';
};

export function ErrorLog({ logs }: ErrorLogProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasLogs = logs.length > 0;
  const recentLogs = logs.slice(-10).reverse(); // Show last 10 logs, most recent first
  const mostSevereType = getMostSevereType(logs);

  // Auto-expand when there are errors
  const shouldShow = hasLogs || isExpanded;

  if (!shouldShow) {
    return null;
  }

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <Container $hasErrors={hasLogs}>
      <Header onClick={() => setIsExpanded(!isExpanded)}>
        <HeaderLeft>
          <StatusIndicator $type={mostSevereType} />
          <LogTitle>Application Log</LogTitle>
          {hasLogs && (
            <LogCount>({logs.length} entries)</LogCount>
          )}
        </HeaderLeft>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {hasLogs && (
            <ClearButton onClick={(e) => {
              e.stopPropagation();
              // TODO(#2): Implement clear logs functionality
            }}>
              Clear
            </ClearButton>
          )}
          <ExpandIcon $isExpanded={isExpanded}>▲</ExpandIcon>
        </div>
      </Header>

      <LogContent $isExpanded={isExpanded}>
        <LogList>
          {recentLogs.map(log => (
            <LogEntry key={log.id} $type={log.type}>
              <LogIcon>{getLogIcon(log.type)}</LogIcon>
              <LogDetails>
                <LogMessage $type={log.type}>{log.message}</LogMessage>
                <LogTimestamp>{formatTimestamp(log.timestamp)}</LogTimestamp>
              </LogDetails>
            </LogEntry>
          ))}
          {logs.length > 10 && (
            <LogEntry $type="info">
              <LogIcon>📝</LogIcon>
              <LogDetails>
                <LogMessage $type="info">
                  ... and {logs.length - 10} more entries
                </LogMessage>
              </LogDetails>
            </LogEntry>
          )}
        </LogList>
      </LogContent>
    </Container>
  );
}
