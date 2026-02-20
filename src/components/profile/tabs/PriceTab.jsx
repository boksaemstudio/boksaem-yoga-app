import React from 'react';

const PriceTab = ({
    images,
    priceTable1,
    priceTable2,
    setLightboxImage
}) => {
    return (
        <div className="fade-in">
            <img 
                src={images.price_table_1 || priceTable1} 
                style={{ width: '100%', borderRadius: '15px', marginBottom: '15px', cursor: 'pointer' }} 
                alt="price" 
                onClick={() => setLightboxImage(images.price_table_1 || priceTable1)} 
            />
            <img 
                src={images.price_table_2 || priceTable2} 
                style={{ width: '100%', borderRadius: '15px', cursor: 'pointer' }} 
                alt="price" 
                onClick={() => setLightboxImage(images.price_table_2 || priceTable2)} 
            />
        </div>
    );
};

export default PriceTab;
