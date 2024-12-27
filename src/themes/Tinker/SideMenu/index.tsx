import "@/assets/css/themes/tinker/side-nav.css";
import { Transition as HeadlessTransition } from '@headlessui/react';
import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { selectMenu } from "@/stores/menuSlice";
import { useAppSelector } from "@/stores/hooks";
import { FormattedMenu, linkTo, nestedMenu, enter, leave } from "./side-menu";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import logoUrl from "@/assets/images/logo.png";
import clsx from "clsx";
import TopBar from "@/components/Themes/Tinker/TopBar";
import MobileMenu from "@/components/MobileMenu";
import { Menu, Popover } from "@/components/Base/Headless";
import { getAuth, signOut } from "firebase/auth"; // Import the signOut method
import { initializeApp } from 'firebase/app';

function Main() {
  // Initialize Firebase app
  const firebaseConfig = {
    apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
    authDomain: "onboarding-a5fcb.firebaseapp.com",
    databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "onboarding-a5fcb",
    storageBucket: "onboarding-a5fcb.appspot.com",
    messagingSenderId: "334607574757",
    appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
    measurementId: "G-2C9J1RY67L"
  };
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const navigate = useNavigate();
  const location = useLocation();
  const [formattedMenu, setFormattedMenu] = useState<
    Array<FormattedMenu | "divider">
  >([]);
  const menuStore = useAppSelector(selectMenu("side-menu"));
  const sideMenu = () => nestedMenu(menuStore, location);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log("Sign-out successful.");
        localStorage.removeItem('contacts'); // Clear contacts from localStorage
        sessionStorage.removeItem('contactsFetched'); // Clear the session marker
  
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  useEffect(() => {
    setFormattedMenu(sideMenu());

    window.addEventListener("resize", () => {
      setWindowWidth(window.innerWidth);
    });
  }, [menuStore, location.pathname]);
  

  return (
    <div
      className={clsx([
        "tinker md:bg-black/[0.15] dark:bg-transparent relative py-5 px-5 md:py-0 sm:px-8 md:px-0",
        "after:content-[''] after:bg-gradient-to-b after:from-theme-1 after:to-theme-2 dark:after:from-darkmode-800 dark:after:to-darkmode-800 after:fixed after:inset-0 after:z-[-2]",
      ])}
    >
      <MobileMenu />
      <div className="flex mt-[4.7rem] md:mt-0 overflow-hidden">
        {/* BEGIN: Side Menu */}
        <nav className="side-nav hidden md:block md:w-[100px] xl:w-[250px] px-5 pb-16 overflow-x-hidden z-10">
          <Link to="/dashboard" className="flex items-center pt-4 pl-5 mt-3 intro-x">
            <img
              alt="Tinker Tailwind HTML Admin Template"
              className="w-6"
              src={logoUrl}
            />
            <span className="hidden ml-3 text-lg text-white xl:block">
              Tinker
            </span>
          </Link>
          <div className="my-6 side-nav__divider"></div>
          <ul>
            {/* BEGIN: First Child */}
            {formattedMenu.map((menu, menuKey) =>
              menu == "divider" ? (
                <li className="my-6 side-nav__divider" key={menuKey}></li>
              ) : (
                <li key={menuKey}>
                  <Tippy
                    as="a"
                    content={menu.title}
                    options={{
                      placement: "right",
                    }}
                    disable={windowWidth > 1260}
                    href={menu.subMenu ? "#" : menu.pathname}
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      linkTo(menu, navigate);
                      setFormattedMenu([...formattedMenu]);
                    }}
                    className={clsx([
                      menu.active ? "side-menu side-menu--active" : "side-menu",
                    ])}
                  >
                    <div className="side-menu__icon">
                      <Lucide icon={menu.icon} />
                    </div>
                    <div className="side-menu__title">
                      {menu.title}
                      {menu.subMenu && (
                        <div
                          className={clsx([
                            "side-menu__sub-icon",
                            { "transform rotate-180": menu.activeDropdown },
                          ])}
                        >
                          <Lucide icon="ChevronDown" />
                        </div>
                      )}
                    </div>
                  </Tippy>
                  {/* BEGIN: Second Child */}
                  {menu.subMenu && (
                    <HeadlessTransition
                      show={menu.activeDropdown}
                      enter="transition ease-out duration-300"
                      leave="transition ease-in duration-300"
                    >
                      <ul
                        className={clsx({
                          "side-menu__sub-open": menu.activeDropdown,
                        })}
                      >
                        {menu.subMenu.map((subMenu, subMenuKey) => (
                          <li key={subMenuKey}>
                            <Tippy
                              as="a"
                              content={subMenu.title}
                              options={{
                                placement: "right",
                              }}
                              disable={windowWidth > 1260}
                              href={subMenu.subMenu ? "#" : subMenu.pathname}
                              onClick={(event: React.MouseEvent) => {
                                event.preventDefault();
                                linkTo(subMenu, navigate);
                                setFormattedMenu([...formattedMenu]);
                              }}
                              className={clsx([
                                subMenu.active
                                  ? "side-menu side-menu--active"
                                  : "side-menu",
                              ])}
                            >
                              <div className="side-menu__icon">
                                <Lucide icon={subMenu.icon} />
                              </div>
                              <div className="side-menu__title">
                                {subMenu.title}
                                {subMenu.subMenu && (
                                  <div
                                    className={clsx([
                                      "side-menu__sub-icon",
                                      {
                                        "transform rotate-180":
                                          subMenu.activeDropdown,
                                      },
                                    ])}
                                  >
                                    <Lucide icon="ChevronDown" />
                                  </div>
                                )}
                              </div>
                            </Tippy>
                            {/* BEGIN: Third Child */}
                            {subMenu.subMenu && (
                              <HeadlessTransition
                                show={subMenu.activeDropdown}
                                enter="transition ease-out duration-300"
                                leave="transition ease-in duration-300"
                              >
                                <ul
                                  className={clsx({
                                    "side-menu__sub-open":
                                      subMenu.activeDropdown,
                                  })}
                                >
                                  {subMenu.subMenu.map(
                                    (lastSubMenu, lastSubMenuKey) => (
                                      <li key={lastSubMenuKey}>
                                        <Tippy
                                          as="a"
                                          content={lastSubMenu.title}
                                          options={{
                                            placement: "right",
                                          }}
                                          disable={windowWidth > 1260}
                                          href={
                                            lastSubMenu.subMenu
                                              ? "#"
                                              : lastSubMenu.pathname
                                          }
                                          onClick={(
                                            event: React.MouseEvent
                                          ) => {
                                            event.preventDefault();
                                            linkTo(lastSubMenu, navigate);
                                            setFormattedMenu([
                                              ...formattedMenu,
                                            ]);
                                          }}
                                          className={clsx([
                                            lastSubMenu.active
                                              ? "side-menu side-menu--active"
                                              : "side-menu",
                                          ])}
                                        >
                                          <div className="side-menu__icon">
                                            <Lucide icon={lastSubMenu.icon} />
                                          </div>
                                          <div className="side-menu__title">
                                            {lastSubMenu.title}
                                          </div>
                                        </Tippy>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </HeadlessTransition>
                            )}
                            {/* END: Third Child */}
                          </li>
                        ))}
                      </ul>
                    </HeadlessTransition>
                  )}
                  {/* END: Second Child */}
                </li>
              )
            )}
            {/* END: First Child */}
          </ul>
          <div className="mb-4">
          <Menu>
          <Menu.Button className="block w-8 h-8 overflow-hidden rounded-md bg-blue-600 flex items-center justify-center text-white mb-2">
                <Link to="/client-ticket">
                  <Lucide icon="Ticket" className="text-center justify-center w-4 h-4" />
                </Link>
              </Menu.Button>
            <Menu.Button className="block w-8 h-8 overflow-hidden rounded-md bg-red-700 flex items-center justify-center text-white">
              <Link to="/logins" onClick={handleSignOut}>
                <Lucide icon="LogOut" className="text-center justify-center w-4 h-4" />
              </Link>
            </Menu.Button>
          </Menu>
        </div>
        </nav>
        {/* END: Side Menu */}
        {/* BEGIN: Content */}
        <div
          className={clsx([
            "rounded-[30px] md:rounded-[35px/50px_0px_0px_0px] min-w-0 min-h-screen max-w-full md:max-w-none bg-slate-100 flex-1 pb-10 px-4 md:px-6 relative md:ml-4 dark:bg-darkmode-700",
            "before:content-[''] before:w-full before:h-px before:block",
            "after:content-[''] after:z-[-1] after:rounded-[40px_0px_0px_0px] after:w-full after:inset-y-0 after:absolute after:left-0 after:bg-white/10 after:mt-8 after:-ml-4 after:dark:bg-darkmode-400/50 after:hidden md:after:block",
          ])}
        >
          <TopBar />
          <Outlet />
        </div>
        {/* END: Content */}
      </div>
    </div>
  );
}

export default Main;
