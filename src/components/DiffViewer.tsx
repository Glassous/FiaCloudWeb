import React, { useEffect, useRef } from 'react';
import * as Diff from 'diff';
import { FaCheck, FaTimes, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import classNames from 'classnames';

interface DiffViewerProps {
    original: string;
    modified: string;
    onApplyChange: (newContent: string) => void;
    onOriginalUpdate: (newContent: string) => void;
    isStreaming?: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ original, modified, onApplyChange, onOriginalUpdate, isStreaming = false }) => {
    const [hunks, setHunks] = React.useState<Diff.Change[]>([]);
    const [currentChangeIndex, setCurrentChangeIndex] = React.useState<number>(-1);
    const changeRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const changes = Diff.diffLines(original, modified);
        setHunks(changes);
        changeRefs.current = changeRefs.current.slice(0, changes.length);
    }, [original, modified]);

    // Navigate to next/prev change
    const scrollToChange = (index: number) => {
        if (index >= 0 && index < changeRefs.current.length) {
            changeRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setCurrentChangeIndex(index);
        }
    };

    const handleNextChange = () => {
        let nextIndex = currentChangeIndex + 1;
        // Find next actual change
        while (nextIndex < hunks.length && !hunks[nextIndex].added && !hunks[nextIndex].removed) {
            nextIndex++;
        }
        if (nextIndex < hunks.length) {
            scrollToChange(nextIndex);
        } else {
            // Loop back or stop? Let's stop.
        }
    };

    const handlePrevChange = () => {
        let prevIndex = currentChangeIndex - 1;
        while (prevIndex >= 0 && !hunks[prevIndex].added && !hunks[prevIndex].removed) {
            prevIndex--;
        }
        if (prevIndex >= 0) {
            scrollToChange(prevIndex);
        }
    };

    // Accept/Reject Logic
    // STRATEGY: 
    // - Accept: Update 'original' to include the change (effectively "merging" it).
    // - Reject: Update 'modified' to revert the change (effectively "undoing" it).
    
    const applyHunkAction = (index: number, action: 'accept' | 'reject') => {
        
        if (action === 'reject') {
             // REJECT: We modify 'modified' to match 'original' for this hunk.
             // This removes additions or restores deletions in the modified view.
             let newContent = '';
             hunks.forEach((hunk, i) => {
                if (i === index) {
                    if (hunk.added) {
                        // Reject addition: Skip it.
                    } else if (hunk.removed) {
                        // Reject deletion: Restore it.
                         newContent += hunk.value;
                    } else {
                        // Unchanged (shouldn't happen for action)
                        newContent += hunk.value;
                    }
                } else {
                    // Reconstruct modified
                    if (!hunk.removed) {
                        newContent += hunk.value;
                    }
                }
            });
            onApplyChange(newContent);
        } else {
            // ACCEPT: We modify 'original' to match 'modified' for this hunk.
            // This makes the addition part of the baseline, or confirms the deletion.
             let newOriginal = '';
             hunks.forEach((hunk, i) => {
                if (i === index) {
                    if (hunk.added) {
                        // Accept addition: Add to original.
                         newOriginal += hunk.value;
                    } else if (hunk.removed) {
                        // Accept deletion: Skip (remove from original).
                    } else {
                         newOriginal += hunk.value;
                    }
                } else {
                    // Reconstruct original
                    // If it was added (and not accepted), it's NOT in original.
                    // If it was removed (and not accepted), it IS in original.
                    if (!hunk.added) {
                        newOriginal += hunk.value;
                    }
                }
            });
            onOriginalUpdate(newOriginal);
        }
    };

    return (
        <div className="diff-viewer">
            <div className="diff-toolbar">
                <span className="diff-stat">
                    Changes: {hunks.filter(h => h.added || h.removed).length}
                </span>
                <div className="diff-nav">
                    <button onClick={handlePrevChange} className="glass-button small" title="Previous Change">
                        <FaArrowUp />
                    </button>
                    <button onClick={handleNextChange} className="glass-button small" title="Next Change">
                        <FaArrowDown />
                    </button>
                </div>
            </div>

            <div className="diff-content">
                {hunks.map((hunk, i) => {
                    // Check if this is the last hunk and we are streaming
                    // If so, and it is a removal, it might be "not generated yet" content
                    const isLast = i === hunks.length - 1;
                    const isPendingRemoval = isStreaming && isLast && hunk.removed;
                    
                    const isChange = (hunk.added || hunk.removed) && !isPendingRemoval;
                    const changeType = hunk.added ? 'added' : hunk.removed && !isPendingRemoval ? 'removed' : 'unchanged';
                    const isActive = i === currentChangeIndex;
                    
                    return (
                        <div 
                            key={i} 
                            ref={el => { changeRefs.current[i] = el; }}
                            className={classNames('diff-hunk', changeType, { active: isActive, pending: isPendingRemoval })}
                        >
                            {isChange && (
                                <div className="hunk-actions">
                                    <button 
                                        className="action-btn accept"
                                        onClick={() => applyHunkAction(i, 'accept')}
                                        title={hunk.added ? "Keep this addition" : "Confirm deletion"}
                                    >
                                        <FaCheck size={10} />
                                    </button>
                                    <button 
                                        className="action-btn reject"
                                        onClick={() => applyHunkAction(i, 'reject')}
                                        title={hunk.added ? "Remove this addition" : "Restore deleted text"}
                                    >
                                        <FaTimes size={10} />
                                    </button>
                                </div>
                            )}
                            <pre>{hunk.value}</pre>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .diff-viewer {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    font-family: Consolas, Monaco, "Courier New", monospace;
                    font-size: 14px;
                }
                
                .diff-toolbar {
                    padding: 8px;
                    background: rgba(var(--bg-secondary-rgb), 0.5);
                    border-bottom: 1px solid var(--border-subtle);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                
                .diff-nav {
                    display: flex;
                    gap: 4px;
                }
                
                .glass-button.small {
                    padding: 4px 8px;
                    font-size: 12px;
                }
                
                .diff-content {
                    flex: 1;
                    overflow: auto;
                    padding: 16px;
                }
                
                .diff-hunk {
                    position: relative;
                    white-space: pre-wrap;
                    word-break: break-all;
                }
                
                .diff-hunk.added {
                    background-color: rgba(76, 175, 80, 0.15);
                    border-left: 3px solid #4caf50;
                }
                
                .diff-hunk.removed {
                    background-color: rgba(244, 67, 54, 0.15);
                    border-left: 3px solid #f44336;
                    text-decoration: line-through;
                    opacity: 0.7;
                }
                
                .diff-hunk.active {
                    background-color: rgba(255, 193, 7, 0.1);
                    outline: 1px solid #ffc107;
                }
                
                .diff-hunk.pending {
                    opacity: 0.5;
                }
                
                .hunk-actions {
                    position: absolute;
                    right: 8px;
                    top: 4px;
                    display: flex;
                    gap: 4px;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                
                .diff-hunk:hover .hunk-actions {
                    opacity: 1;
                }
                
                .action-btn {
                    width: 20px;
                    height: 20px;
                    border-radius: 4px;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    background: var(--bg-panel);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-primary);
                }
                
                .action-btn.accept:hover {
                    background: #4caf50;
                    color: white;
                    border-color: #4caf50;
                }
                
                .action-btn.reject:hover {
                    background: #f44336;
                    color: white;
                    border-color: #f44336;
                }
                
                pre {
                    margin: 0;
                    padding: 2px 0;
                }
            `}</style>
        </div>
    );
};

export default DiffViewer;