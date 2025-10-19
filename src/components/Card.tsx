import React, { SVGProps } from 'react';

type CardProps = {
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  title: string;
  description: string;
};

const Card = ({ icon: Icon, title, description }: CardProps) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-start space-x-4 border border-gray-100">
      <div className="flex-shrink-0">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 text-base mb-1">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </div>
  );
};

export default Card;
