import { useState } from 'preact/hooks';
import type { LogEntry } from '../types/index.ts';

interface ErrorLogProps {
  logs: LogEntry[];
  isDebugMode?: boolean;
  onClearLogs?: () => void;
}

/**
 * Returns the icon emoji for a log entry type
 */
function getLogIcon(type: 'error' | 'warning' | 'info'): string {
  switch (type) {
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '📝';
  }
}

/**
 * Returns the most severe log type from a list of logs
 */
function getMostSevereType(logs: LogEntry[]): 'error' | 'warning' | 'info' {
  if (logs.some((log) => log.type === 'error')) return 'error';
  if (logs.some((log) => log.type === 'warning')) return 'warning';
  return 'info';
}

/**
 * Formats a timestamp for display
 */
function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * ErrorLog component displays application logs in an expandable panel
 */
export function ErrorLog(
  { logs, isDebugMode = false, onClearLogs }: ErrorLogProps,
): JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasLogs = logs.length > 0;
  const recentLogs = logs.slice(-10).reverse(); // Show last 10 logs, most recent first
  const mostSevereType = getMostSevereType(logs);

  // Only show if debug mode is enabled and there are logs
  const shouldShow = isDebugMode && (hasLogs || isExpanded);

  if (!shouldShow) {
    return null;
  }

  const handleClearClick = (e: MouseEvent): void => {
    e.stopPropagation();
    if (onClearLogs) {
      onClearLogs();
    }
  };

  return (
    <div className={`error-log-container ${hasLogs ? 'visible' : ''}`}>
      <button
        className='error-log-header'
        onClick={() => setIsExpanded(!isExpanded)}
        type='button'
      >
        <div className='error-log-header-left'>
          <div className={`error-log-status-indicator ${mostSevereType}`} />
          <span className='error-log-title'>Application Log</span>
          {hasLogs && <span className='error-log-count'>({logs.length} entries)</span>}
        </div>
        <div className='error-log-header-right'>
          {hasLogs && onClearLogs && (
            <button
              className='error-log-clear-button'
              onClick={handleClearClick}
              type='button'
            >
              Clear
            </button>
          )}
          <span className={`error-log-expand-icon ${isExpanded ? 'expanded' : ''}`}>▲</span>
        </div>
      </button>

      <div className={`error-log-content ${isExpanded ? 'expanded' : ''}`}>
        <div className='error-log-list'>
          {recentLogs.map((log) => (
            <div key={log.id} className={`error-log-entry ${log.type}`}>
              <span className='error-log-icon'>{getLogIcon(log.type)}</span>
              <div className='error-log-details'>
                <div className={`error-log-message ${log.type}`}>{log.message}</div>
                <div className='error-log-timestamp'>{formatTimestamp(log.timestamp)}</div>
              </div>
            </div>
          ))}
          {logs.length > 10 && (
            <div className='error-log-entry info'>
              <span className='error-log-icon'>📝</span>
              <div className='error-log-details'>
                <div className='error-log-message info'>
                  ... and {logs.length - 10} more entries
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
