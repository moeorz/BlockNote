import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipState {
  content: string;
  position: {
    top: number;
    left: number;
  };
  visible: boolean;
}

export const TooltipPortal: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    content: '',
    position: { top: 0, left: 0 },
    visible: false,
  });

  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const alias = target.getAttribute('data-alias');
      
      if (alias && alias !== 'null') {
        const rect = target.getBoundingClientRect();
        setTooltip({
          content: alias,
          position: {
            top: rect.top + window.scrollY + (rect.height / 2),
            left: rect.right + window.scrollX + 8,
          },
          visible: true,
        });
      }
    };

    const handleMouseLeave = () => {
      setTooltip(prev => ({ ...prev, visible: false }));
    };

    const addTooltipListeners = (element: HTMLElement) => {
      const blocks = element.querySelectorAll('[data-alias]');
      blocks.forEach(block => {
        if (block instanceof HTMLElement) {
          block.addEventListener('mouseenter', handleMouseEnter);
          block.addEventListener('mouseleave', handleMouseLeave);
        }
      });
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              addTooltipListeners(node);
            }
          });
        }
      });
    });

    // 初始化时处理现有的块
    const editorElement = document.querySelector('.bn-container');
    if (editorElement instanceof HTMLElement) {
      addTooltipListeners(editorElement);
      observer.observe(editorElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-alias'],
      });
    }

    return () => {
      observer.disconnect();
      // 清理事件监听器
      const blocks = document.querySelectorAll('[data-alias]');
      blocks.forEach(block => {
        if (block instanceof HTMLElement) {
          block.removeEventListener('mouseenter', handleMouseEnter);
          block.removeEventListener('mouseleave', handleMouseLeave);
        }
      });
    };
  }, []);

  return createPortal(
    tooltip.visible && (
      <div
        className="bn-tooltip bn-tooltip-right"
        style={{
          position: 'absolute',
          top: `${tooltip.position.top}px`,
          left: `${tooltip.position.left}px`,
          transform: 'translateY(-50%)',
        }}>
        {tooltip.content}
      </div>
    ),
    document.body
  );
}; 