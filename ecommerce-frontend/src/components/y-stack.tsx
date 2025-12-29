import React from "react";
import { View, ViewStyle } from "react-native";

interface YStackProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gap?: number;
  justifyContent?: ViewStyle["justifyContent"];
  alignItems?: ViewStyle["alignItems"];
  flex?: number;
  margin?: number | `${number}%`;
}

export const YStack: React.FC<YStackProps> = ({
  children,
  style,
  gap = 0,
  justifyContent = "flex-start",
  alignItems = "flex-start",
  flex,
  margin,
}) => {
  const childArray = React.Children.toArray(children);

  return (
    <View
      style={[
        {
          flexDirection: "column",
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
          style={{ marginBottom: index !== childArray.length - 1 ? gap : 0 }}
        >
          {child}
        </View>
      ))}
    </View>
  );
};
