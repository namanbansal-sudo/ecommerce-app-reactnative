import React from "react";
import { View, ViewStyle } from "react-native";

interface XStackProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gap?: number;
  justifyContent?: ViewStyle["justifyContent"];
  alignItems?: ViewStyle["alignItems"];
  flex?: number;
  margin?: number | `${number}%`;
}

export const XStack: React.FC<XStackProps> = ({
  children,
  style,
  gap = 0,
  justifyContent = "flex-start",
  alignItems = "center",
  flex,
  margin,
}) => {
  const childArray = React.Children.toArray(children);

  return (
    <View
      style={[
        {
          flexDirection: "row",
          justifyContent,
          alignItems,
          flex,
          margin,
        },
        style,
      ]}
    >
      {childArray.map((child, index) => (
        <View
          key={index}
          style={{ marginRight: index !== childArray.length - 1 ? gap : 0 }}
        >
          {child}
        </View>
      ))}
    </View>
  );
};
