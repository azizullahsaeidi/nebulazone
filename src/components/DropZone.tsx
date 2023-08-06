import React from 'react';
import {useState, useCallback, useRef} from 'react';

import '../tailwind.css';
import {useEventListener} from '../utils/useEvent';
import {isBrowser} from '../utils/isBrowser';
import {
  cancelDefaultEvent,
  getAllDragedFiles,
  checkFileAcceptance,
  getValidationErrors,
} from '../utils/fileValidation';
import type {ValidationError} from '../utils/fileValidation';
import {getNumericAspectRatioFromString} from '../utils/crop';
import {DropZoneContext} from '../DropZoneContext';
import {Preview} from './Preview';

export type ByteUnits = 'B' | 'KB' | 'MB' | 'GB';

export interface DropzoneProps {
  /** Allowed file types */
  accept?: string;
  /** The file type */
  type?: string;
  /** Whether accept multiple file.  */
  allowMultiple?: boolean;
  /** The maximum allowed file size in bytes. */
  maxFileSize?: `${number}${ByteUnits}`;
  /** The minimum allowed file size in bytes. */
  minFileSize?: `${number}${ByteUnits}`;
  /** The maximum allowed total file size in bytes. */
  maxTotalFileSize?: `${number}${ByteUnits}`;
  /** Enables the disabled state. */
  disabled?: boolean;
  /** The elements that will be rendered as children inside the dropzone. */
  children?: string | React.ReactNode;
  /** The layout style for the panel. */
  panelLayout?: 'integrated' | 'compact' | 'circle';
  /** Preview an error text or react element. */
  errorMarkupView?: string | React.ReactElement | null;
  /** The aspect ratio of the panel. */
  panelAspectRatio?: string | `${string}:${string}`;
  /** Callback invoked on click action. */
  onClick?(event: React.MouseEvent<HTMLElement>): void;
  /** Callback function that activates when the drop operation includes at least one accepted file. */
  onDropAccepted?: (acceptedFiles: File[]) => void;
  /** Callback function triggered when the drop operation includes at least one file that was rejected. */
  onDropRejected?: (rejectedFiles: File[]) => void;
  /** Callback triggered during file drag over the designated area. */
  onDragOver?: () => void;
  /** Callback triggered upon the entry of one or more files into the drag area. */
  onDragEnter?: () => void;
  /** Callback triggered when one or more files exit the drag area. */
  onDragLeave?: () => void;
  /** Callback triggered when files are droped. */
  onDrop?: (
    files: File[],
    acceptedFiles: File[],
    rejectedFiles: File[],
    errors: ValidationError[],
  ) => void;
}

export function DropZone({
  maxFileSize,
  minFileSize,
  maxTotalFileSize,
  accept,
  type = 'file',
  disabled = false,
  allowMultiple = true,
  onClick,
  children,
  panelLayout = 'integrated',
  errorMarkupView = null,
  panelAspectRatio,
  onDrop,
  onDropAccepted,
  onDropRejected,
  onDragEnter,
  onDragOver,
  onDragLeave,
}: DropzoneProps) {
  const [dragEnter, setDragEnter] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const targetNode = useRef<HTMLDivElement>(null);
  const draggedRejectedFiles = useRef<File[]>([]);

  // console.log('hasError', hasError);

  const filterValidFiles = useCallback(
    (
      event:
        | React.ChangeEvent<HTMLInputElement>
        | React.DragEvent<HTMLInputElement>,
    ) => {
      const fileList = getAllDragedFiles(event);

      const {acceptedFiles, rejectedFiles} = checkFileAcceptance(
        fileList,
        accept,
        maxFileSize,
        minFileSize,
      );

      if (!allowMultiple && acceptedFiles.length > 0) {
        const [acceptedFile, ...remainingFiles] = acceptedFiles;
        rejectedFiles.push(...remainingFiles);

        return {files: fileList, acceptedFiles: [acceptedFile], rejectedFiles};
      }

      return {files: fileList, acceptedFiles, rejectedFiles};
    },
    [accept, allowMultiple, draggedRejectedFiles],
  );

  const handleDrop = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      cancelDefaultEvent(event);
      if (disabled) return;

      const {files, acceptedFiles, rejectedFiles} = filterValidFiles(event);

      const errors = getValidationErrors(
        rejectedFiles,
        accept,
        minFileSize,
        maxFileSize,
      );

      if (onDrop) {
        onDrop(files, acceptedFiles, rejectedFiles, errors);
      }

      if (acceptedFiles.length && onDropAccepted) {
        onDropAccepted(acceptedFiles);
      }

      if (rejectedFiles.length && onDropRejected) {
        onDropRejected(rejectedFiles);
      }

      setHasError(false);
      setDragEnter(false);
      draggedRejectedFiles.current = [];
    },
    [disabled, onDrop, accept, onDropAccepted, onDropRejected],
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLInputElement>) => {
      cancelDefaultEvent(event);
      if (disabled) return;

      const {rejectedFiles} = filterValidFiles(event);

      if (rejectedFiles.length > 0) {
        draggedRejectedFiles.current = rejectedFiles;
      }

      if (onDragEnter) onDragEnter();
    },
    [disabled, dragEnter, onDragEnter],
  );

  const handleDragLeave = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      cancelDefaultEvent(event);
      if (disabled) return;

      if (onDragLeave) onDragLeave();
    },
    [disabled, onDragLeave],
  );

  const handleDragOver = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      cancelDefaultEvent(event);
      if (disabled) return;
      if (onDragOver) onDragOver();
    },
    [disabled, onDragOver],
  );

  const handleDragEnterDropZone = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      cancelDefaultEvent(event);
      if (disabled) return;

      if (draggedRejectedFiles.current.length > 0) {
        setHasError(true);
      }
      setDragEnter(true);
    },
    [draggedRejectedFiles, setHasError],
  );

  const handleDragLeaveDropZone = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      cancelDefaultEvent(event);
      if (disabled) return;

      if (event.currentTarget.contains(event.relatedTarget as Node)) {
        return;
      }

      setDragEnter(false);
      setHasError(false);
    },
    [draggedRejectedFiles, setHasError],
  );

  const dragDropNode = isBrowser() ? document : targetNode.current;

  useEventListener('dragover', handleDragOver, dragDropNode);
  useEventListener('drop', handleDrop, dragDropNode);
  useEventListener('dragenter', handleDragEnter, dragDropNode);
  useEventListener('dragleave', handleDragLeave, dragDropNode);

  function handleClick(event: React.MouseEvent<HTMLElement>) {
    if (disabled) return;

    if (inputRef.current) {
      inputRef.current.click();
    }

    if (onClick) {
      onClick(event);
    }
  }

  const getPanelAspectRatio = () => {
    const isShapeCircle = /circle/.test(panelLayout);
    const aspectRatio = isShapeCircle
      ? 1
      : getNumericAspectRatioFromString(panelAspectRatio as string);
    return aspectRatio;
  };

  const contextValue = {
    accept,
    type,
    allowMultiple,
    maxFileSize,
    panelLayout,
    minFileSize,
    maxTotalFileSize,
    disabled,
    panelAspectRatio: getPanelAspectRatio(),
    rootNode: targetNode,
  };

  return (
    <DropZoneContext.Provider value={contextValue}>
      <div
        className="dropzone h-full w-full relative inset-0 border-dashed rounded-md	flex flex-col justify-center border-2 min-h-[14.5rem] hover:cursor-pointer"
        onDragStart={cancelDefaultEvent}
        onDragEnter={handleDragEnterDropZone}
        onDragLeave={handleDragLeaveDropZone}
        ref={targetNode}
        onClick={handleClick}
        draggable="true"
        data-testid="dropzone"
      >
        <span className="hidden">
          <input
            accept={accept}
            disabled={disabled}
            multiple={allowMultiple}
            onChange={handleDrop}
            type="file"
            ref={inputRef}
            autoComplete="off"
          />
        </span>
        {hasError && errorMarkupView}
        {children}
      </div>
    </DropZoneContext.Provider>
  );
}

DropZone.Preview = Preview;