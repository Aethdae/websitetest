import PageWrapper from "@/components/PageWrapper";
import Header from "../header/Header";
import { ReactNode, useEffect, useRef, useState } from "react";
import CategoryTitle, { CategoryTitleProps } from "../CategoryTitle";
import contextStyles from "./ContextColors.module.css";
import styles from "./Layout.module.css";
import NavigationMenu from "../navigation-menu/NavigationMenu";
import { useAppContext } from "../navigation-menu/AppContext";
import { useRouter } from "next/router";
import Head from "next/head";

type LayoutProps = CategoryTitleProps & {
  recordName?: string;
  sectionName: string;
  children: ReactNode;
};

export default function Layout({
  children,
  recordName,
  sectionName,
  ...categoryTitleProps
}: LayoutProps) {
  const [isMenuVisible, setMenuVisibility] = useState(false);
  const { context } = useAppContext();
  const router = useRouter();
  const searchBarRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenuVisibility = () => {
    setMenuVisibility(!isMenuVisible);
  };

  const handleClickOutsideMenu = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setMenuVisibility(false);
      event.stopPropagation();
    }
  };

  useEffect(() => {
    if (isMenuVisible) {
      document.addEventListener("mousedown", handleClickOutsideMenu);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideMenu);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideMenu);
    };
  }, [isMenuVisible]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        switch (event.key.toLowerCase()) {
          case "t":
            router.push("/today");
            break;
          case "m":
            router.push("/meetings");
            break;
          case "c":
            router.push("/commitments");
            break;
          case "k":
            searchBarRef.current?.focus();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  return (
    <PageWrapper>
      <Head>
        <title>{`Impulso ${
          recordName ? `- ${recordName}` : ""
        } · ${sectionName}`}</title>
      </Head>
      <div
        className={
          {
            family: contextStyles.familyColorScheme,
            hobby: contextStyles.hobbyColorScheme,
            work: contextStyles.workColorScheme,
          }[context]
        }
      >
        <Header
          toggleMenu={toggleMenuVisibility}
          menuIsOpen={isMenuVisible}
          searchBarRef={searchBarRef}
        />
        <NavigationMenu
          ref={menuRef}
          isOpen={isMenuVisible}
          closeMenu={() => setMenuVisibility(false)}
        />
        <main
          className={`${styles.page} ${isMenuVisible ? styles.menuOpen : ""}`}
        >
          <div className={styles.pageContent}>
            <div
              className={`${styles.sheet} ${styles.sheetVh} ${styles.sheetContent}`}
            >
              <div className={styles.categoryWrapper}>
                <CategoryTitle {...(categoryTitleProps || {})} />
                <div className={styles.categoryContent}>{children}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageWrapper>
  );
}
