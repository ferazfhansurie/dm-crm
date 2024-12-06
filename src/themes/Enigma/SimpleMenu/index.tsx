import "@/assets/css/themes/enigma/side-nav.css";
import { Transition as HeadlessTransition } from '@headlessui/react';
import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { selectMenu } from "@/stores/menuSlice";
import { useAppSelector } from "@/stores/hooks";
import { FormattedMenu, linkTo, nestedMenu, enter, leave } from "./simple-menu";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";
import TopBar from "@/components/Themes/Enigma/TopBar";
import MobileMenu from "@/components/MobileMenu";

function Main() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formattedMenu, setFormattedMenu] = useState<
    Array<FormattedMenu | "divider">
  >([]);
  const menuStore = useAppSelector(selectMenu("simple-menu"));
  const menu = () => nestedMenu(menuStore, location);

  useEffect(() => {
    setFormattedMenu(menu());
  }, [menuStore, location.pathname]);

  return (
    <div
      className={clsx([
        "enigma py-5 px-5 md:py-0 sm:px-8 md:px-0",
        "before:content-[''] before:bg-gradient-to-b before:from-theme-1 before:to-theme-2 dark:before:from-darkmode-800 dark:before:to-darkmode-800 md:before:bg-none md:bg-slate-200 md:dark:bg-darkmode-800 before:fixed before:inset-0 before:z-[-1]",
      ])}
    >
      <MobileMenu />
      <TopBar layout="simple-menu" />
      <div className="flex overflow-hidden">
        {/* BEGIN: Simple Menu */}
        <nav className="side-nav side-nav--simple w-[100px] px-5 pb-16 overflow-x-hidden z-50 pt-32 -mt-4 hidden md:block">
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
                      placement: "left",
                    }}
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
                            menu.activeDropdown && "transform rotate-180",
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
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-300"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
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
                                placement: "left",
                              }}
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
                                      subMenu.activeDropdown &&
                                        "transform rotate-180",
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
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-300"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
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
                                            placement: "left",
                                          }}
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
        </nav>
        {/* END: Simple Menu */}
        {/* BEGIN: Content */}
        <div
          className={clsx([
            "max-w-full md:max-w-none rounded-[30px] md:rounded-none px-4 md:px-[22px] min-w-0 min-h-screen bg-slate-100 flex-1 md:pt-20 pb-10 mt-5 md:mt-1 relative dark:bg-darkmode-700",
            "before:content-[''] before:w-full before:h-px before:block",
          ])}
        >
          <Outlet />
        </div>
        {/* END: Content */}
      </div>
    </div>
  );
}

export default Main;
