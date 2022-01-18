import humps from "humps";
import isEmpty from "lodash/isEmpty";

// Used to generate data-test attributes on non-production environments and used by end-to-end tests
export const dataTest = (value: string, disable: boolean) => {
  const attribute =
    window.NODE_ENV !== "production" && !disable ? { "data-test": value } : {};
  return attribute;
};

export const camelCase = (str: string) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
      return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
    })
    .replace(/\s+/g, "");
};

export const titleCase = (value: string) =>
  `${value.charAt(0).toUpperCase()}${value.substring(1).toLowerCase()}`;

export const snakeToTitleCase = (value: string) =>
  value
    .split("_")
    .map((s) => titleCase(s))
    .join(" ");

export const nameComponents = (name: string) => {
  let firstName;
  let lastName;

  if (isEmpty(name)) return { firstName, lastName };

  const splitName = name.split(" ");
  if (splitName.length === 1) {
    [firstName] = splitName;
    lastName = "";
  } else if (splitName.length === 2) {
    [firstName, lastName] = splitName;
  } else {
    [firstName] = splitName;
    lastName = splitName.slice(1, splitName.length + 1).join(" ");
  }

  return { firstName, lastName };
};

export const recordToCamelCase = <T = any>(record: any) =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [humps.camelize(key), value])
  ) as T;