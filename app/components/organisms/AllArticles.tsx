import React from 'react'
import TitleItem from '../atoms/TitleItem'
import { theme } from '@/app/theme'
import styled from 'styled-components'
import ArticleCard from '../molecules/ArticleCard';
import { getAllPosts } from '@/lib/notion/notion';

const SConentWrapper = styled.div`
  margin-left: auto;
  margin-right: auto;
  width: ${theme.contentWidth};
  background-color: ${theme.ContentsColors.main};
`;

const CardWrapper = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    column-gap: 2%;
    row-gap: 0px;
    margin-top: 8px;
`;


// export const test = async () => {
//   const allPosts = await getAllPosts();
//   return allPosts
// };

export async function getServerSideProps() {
  const allPosts = await getAllPosts();

  return {
    props: { allPosts }, // ページコンポーネントにデータを渡す
  };
}


const AllArticles = async ({allPosts}: any) => {
  // const allPosts = await getAllPosts();
  // console.log("allPosts")
  // console.log(allPosts)
  console.log("test")
  console.log(allPosts)

  return (
    <SConentWrapper>
        <TitleItem 
            fontSize={theme.fontsize.large} 
            color={theme.ContentsColors.sub} 
        >
            All Articles
        </TitleItem>
        <CardWrapper>
            <ArticleCard />
            <ArticleCard />
            <ArticleCard />
            <ArticleCard />
            <ArticleCard />
        </CardWrapper>
    </SConentWrapper>
  )
}

export default AllArticles
