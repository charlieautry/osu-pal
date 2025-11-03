/**
 * CSS Module Type Declarations for OSU PAL
 * 
 * This file provides TypeScript type definitions for CSS module imports.
 * It enables type-safe CSS class name usage when importing CSS files
 * as modules in TypeScript/TSX components.
 * 
 * Allows patterns like:
 * import styles from './component.module.css';
 * <div className={styles.myClass} />
 * 
 * While this app primarily uses Tailwind utility classes, this declaration
 * ensures compatibility if CSS modules are used in the future.
 */
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}